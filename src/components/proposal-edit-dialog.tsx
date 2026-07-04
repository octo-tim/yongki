"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/searchable-select";
import { Pencil, X, Plus, History, Receipt } from "lucide-react";

type Item = { name: string; spec?: string; qty: number; unitPrice: number; remark?: string; photo?: string };
type Proposal = {
  id: string; title: string; docType?: string | null; currency: string | null; depositPct?: number | null; vatApplied?: boolean | null;
  items?: any; note: string | null; revisionNo?: number | null; sentDate?: string | null;
  client?: { id: string; name: string } | null;
};
type Opt = { id: string; name: string };
type Rev = { id: string; revisionNo: number; title: string; amount: any; currency: string | null; editedByName: string | null; invoiceId: string | null; createdAt: string };
type Row = { name: string; spec: string; qty: string; unitPrice: string; remark: string; photo: string };

const toRow = (it: Item): Row => ({ name: it.name ?? "", spec: it.spec ?? "", qty: String(it.qty ?? ""), unitPrice: String(it.unitPrice ?? ""), remark: it.remark ?? "", photo: it.photo ?? "" });
const emptyRow = (): Row => ({ name: "", spec: "", qty: "", unitPrice: "", remark: "", photo: "" });

export function ProposalEditDialog({ proposal, clients = [] }: { proposal: Proposal; clients?: Opt[] }) {
  const router = useRouter();
  const isInvoice = (proposal.docType ?? "PROPOSAL") === "INVOICE";
  const docLabel = isInvoice ? "인보이스" : "제안서";

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(proposal.title);
  const [note, setNote] = useState(proposal.note ?? "");
  const [vatApplied, setVatApplied] = useState(proposal.vatApplied ?? isInvoice);
  const [currency, setCurrency] = useState(proposal.currency ?? "KRW");
  const [depositPct, setDepositPct] = useState(String(proposal.depositPct ?? 30));
  const [clientId, setClientId] = useState(proposal.client?.id ?? "");
  const [sentDate, setSentDate] = useState(proposal.sentDate ? new Date(proposal.sentDate).toISOString().slice(0, 10) : "");
  const [rows, setRows] = useState<Row[]>(() => {
    const its = Array.isArray(proposal.items) ? proposal.items : [];
    return its.length ? its.map(toRow) : [emptyRow()];
  });
  const [busy, setBusy] = useState(false);
  const [revs, setRevs] = useState<Rev[]>([]);
  const [showHist, setShowHist] = useState(false);

  useEffect(() => {
    if (open) fetch(`/api/proposals/${proposal.id}/revisions`).then((r) => r.ok ? r.json() : []).then(setRevs).catch(() => {});
  }, [open, proposal.id]);

  const num = (s: string) => (s === "" ? 0 : Number(s) || 0);
  const supply = rows.reduce((a, r) => a + num(r.qty) * num(r.unitPrice), 0);
  const vat = vatApplied ? Math.round(supply * 0.1) : 0;
  const total = supply + vat;
  const depPct = Math.min(100, Math.max(0, num(depositPct) || 30));
  const deposit = Math.round((total * depPct) / 100);

  function setRow(i: number, k: keyof Row, v: string) { setRows((rs) => rs.map((r, idx) => idx === i ? { ...r, [k]: v } : r)); }

  async function setPhoto(i: number, file: File | null) {
    if (!file) return;
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const img = new Image(); const reader = new FileReader();
      reader.onload = () => { img.src = String(reader.result); };
      reader.onerror = reject;
      img.onload = () => {
        const max = 320; const scale = Math.min(1, max / img.width);
        const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
        const c = document.createElement("canvas"); c.width = w; c.height = h;
        const ctx = c.getContext("2d"); if (!ctx) return reject(new Error("canvas"));
        ctx.drawImage(img, 0, 0, w, h); resolve(c.toDataURL("image/jpeg", 0.8));
      };
      img.onerror = reject; reader.readAsDataURL(file);
    });
    setRows((rs) => rs.map((r, idx) => idx === i ? { ...r, photo: dataUrl } : r));
  }

  async function save() {
    if (!title.trim()) return alert("제목을 입력하세요");
    setBusy(true);
    const items = rows.filter((r) => r.name.trim()).map((r) => ({ name: r.name.trim(), spec: r.spec.trim(), qty: num(r.qty), unitPrice: num(r.unitPrice), remark: r.remark.trim(), photo: r.photo || undefined }));
    const res = await fetch(`/api/proposals/${proposal.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ edit: { title, note, vatApplied, items, currency, depositPct: depPct, clientId: clientId || null, sentDate: sentDate || null } }),
    });
    setBusy(false);
    if (res.ok) { setOpen(false); router.refresh(); }
    else { const j = await res.json().catch(() => ({})); alert(j.error || "수정 실패"); }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="shrink-0 rounded p-1 text-muted-foreground hover:bg-accent" title={`${docLabel} 수정`}><Pencil className="h-3.5 w-3.5" /></button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setOpen(false)}>
          <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-card p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold">{docLabel} 수정 <span className="text-xs font-normal text-muted-foreground">(현재 v{proposal.revisionNo ?? 1})</span></h3>
              <button onClick={() => setOpen(false)}><X className="h-5 w-5" /></button>
            </div>
            <p className="mb-3 rounded-md bg-amber-50 px-2 py-1.5 text-xs text-amber-800">저장하면 현재 내용이 <b>v{proposal.revisionNo ?? 1}</b>로 이력에 보관되고, 새 버전이 됩니다.</p>

            {/* 제목 · 업체 */}
            <div className="mb-2 grid gap-2 sm:grid-cols-2">
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="제목" className="h-9" />
              {clients.length > 0
                ? <SearchableSelect options={clients} value={clientId} onChange={setClientId} placeholder="업체 선택" className="h-9" />
                : <Input value={proposal.client?.name ?? ""} disabled className="h-9" />}
            </div>

            {/* 항목 표 (사진 포함) */}
            <div className="mb-2 overflow-x-auto rounded-md border">
              <table className="w-full text-xs">
                <thead className="bg-muted/40"><tr>
                  <th className="w-14 px-2 py-1.5">사진</th>
                  <th className="px-2 py-1.5 text-left">제품명</th><th className="w-28 px-2 py-1.5">재원</th>
                  <th className="w-14 px-2 py-1.5">수량</th><th className="w-20 px-2 py-1.5">단가</th>
                  <th className="w-20 px-2 py-1.5 text-right">금액</th><th className="px-2 py-1.5 text-left">비고</th><th className="w-6"></th>
                </tr></thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} className="border-t align-top">
                      <td className="p-1">
                        <label className="flex h-11 w-11 cursor-pointer items-center justify-center overflow-hidden rounded border bg-muted/30 hover:bg-accent">
                          {r.photo ? <img src={r.photo} alt="" className="h-full w-full object-cover" /> : <span className="text-[10px] text-muted-foreground">사진</span>}
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => setPhoto(i, e.target.files?.[0] ?? null)} />
                        </label>
                      </td>
                      <td className="p-1"><input value={r.name} onChange={(e) => setRow(i, "name", e.target.value)} className="w-full bg-transparent px-1 py-1 outline-none" /></td>
                      <td className="p-1"><textarea value={r.spec} onChange={(e) => setRow(i, "spec", e.target.value)} rows={2} className="w-full resize-y bg-transparent px-1 py-1 outline-none" /></td>
                      <td className="p-1"><input type="number" value={r.qty} onChange={(e) => setRow(i, "qty", e.target.value)} className="w-full bg-transparent px-1 py-1 text-right outline-none" /></td>
                      <td className="p-1"><input type="number" step="any" value={r.unitPrice} onChange={(e) => setRow(i, "unitPrice", e.target.value)} className="w-full bg-transparent px-1 py-1 text-right outline-none" /></td>
                      <td className="p-1 pt-2 text-right tabular-nums">{(num(r.qty) * num(r.unitPrice)).toLocaleString()}</td>
                      <td className="p-1"><textarea value={r.remark} onChange={(e) => setRow(i, "remark", e.target.value)} rows={2} className="w-full resize-y bg-transparent px-1 py-1 outline-none" /></td>
                      <td className="p-1 pt-2 text-center">{rows.length > 1 && <button onClick={() => setRows((rs) => rs.filter((_, idx) => idx !== i))}><X className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" /></button>}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t bg-muted/20 font-medium">
                  <tr><td colSpan={5} className="px-2 py-1 text-right">합계</td><td className="px-2 py-1 text-right tabular-nums">{supply.toLocaleString()}</td><td colSpan={2} /></tr>
                  {vatApplied && <tr><td colSpan={5} className="px-2 py-1 text-right">부가세</td><td className="px-2 py-1 text-right tabular-nums">{vat.toLocaleString()}</td><td colSpan={2} /></tr>}
                  <tr className="font-bold"><td colSpan={5} className="px-2 py-1 text-right">합계금액</td><td className="px-2 py-1 text-right tabular-nums">{total.toLocaleString()}</td><td colSpan={2} /></tr>
                  {isInvoice && <>
                    <tr className="bg-yellow-100 font-bold"><td colSpan={5} className="px-2 py-1 text-right">계약금 ({depPct}%)</td><td className="px-2 py-1 text-right tabular-nums">{deposit.toLocaleString()}</td><td colSpan={2} /></tr>
                    <tr><td colSpan={5} className="px-2 py-1 text-right">잔금 ({100 - depPct}%)</td><td className="px-2 py-1 text-right tabular-nums">{(total - deposit).toLocaleString()}</td><td colSpan={2} /></tr>
                  </>}
                </tfoot>
              </table>
            </div>

            {/* 옵션 줄: 항목추가 · 부가세 · 계약금 · 통화 · 견적일 */}
            <div className="mb-2 flex flex-wrap items-center gap-3">
              <button onClick={() => setRows((rs) => [...rs, emptyRow()])} className="flex items-center gap-1 text-xs text-primary hover:underline"><Plus className="h-3.5 w-3.5" />항목 추가</button>
              <label className="flex items-center gap-1.5 text-xs"><input type="checkbox" checked={vatApplied} onChange={(e) => setVatApplied(e.target.checked)} />부가세 10%</label>
              {isInvoice && (
                <label className="flex items-center gap-1 text-xs">계약금
                  <input type="number" value={depositPct} onChange={(e) => setDepositPct(e.target.value)} className="h-7 w-14 rounded border bg-background px-1 text-right" />%
                </label>
              )}
              <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="h-8 rounded-md border bg-background px-2 text-xs">
                <option>KRW</option><option>RMB</option><option>USD</option>
              </select>
              <label className="flex items-center gap-1 text-xs">{isInvoice ? "작성일" : "견적일"}
                <Input type="date" value={sentDate} onChange={(e) => setSentDate(e.target.value)} className="h-7 w-36" />
              </label>
            </div>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="비고" className="mb-3 h-9" />

            <div className="mb-3 flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => setOpen(false)}>취소</Button>
              <Button size="sm" onClick={save} disabled={busy}>{busy ? "저장 중..." : "저장 (새 버전)"}</Button>
            </div>

            <button onClick={() => setShowHist((v) => !v)} className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
              <History className="h-3.5 w-3.5" />버전 이력 {revs.length > 0 && `(${revs.length})`}
            </button>
            {showHist && (
              <div className="mt-2 divide-y rounded-md border text-xs">
                {revs.length === 0 && <p className="px-3 py-2 text-muted-foreground">이전 버전이 없습니다.</p>}
                {revs.map((rv) => (
                  <div key={rv.id} className="flex items-center gap-2 px-3 py-2">
                    <span className="rounded bg-muted px-1.5 py-0.5 font-semibold">v{rv.revisionNo}</span>
                    <span className="flex-1 truncate">{rv.title}</span>
                    {rv.amount != null && <span className="text-muted-foreground">{Number(rv.amount).toLocaleString()} {rv.currency ?? "KRW"}</span>}
                    {rv.editedByName && <span className="text-muted-foreground">{rv.editedByName}</span>}
                    <span className="text-muted-foreground">{new Date(rv.createdAt).toISOString().slice(0, 10)}</span>
                    {rv.invoiceId
                      ? <Link href={`/quote/${rv.invoiceId}`} className="flex items-center gap-0.5 rounded-full bg-rose-100 px-1.5 py-0.5 text-rose-700 hover:bg-rose-200"><Receipt className="h-3 w-3" />인보이스</Link>
                      : <span className="text-muted-foreground/50">-</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
