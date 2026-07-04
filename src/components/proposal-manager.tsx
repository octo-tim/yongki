"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/searchable-select";
import { Send, FileText, Trash2, Download, Plus, X, Printer, Receipt, Mail } from "lucide-react";
import { cn, fmtUnit } from "@/lib/utils";
import { ProposalEditDialog } from "@/components/proposal-edit-dialog";

type Proposal = {
  id: string; title: string; productName: string | null; amount: any; currency: string | null; status: string;
  docType?: string | null; depositPct?: number | null; sentTo?: string | null; sentAt?: string | null; sourceId?: string | null; revisionNo?: number | null; vatApplied?: boolean | null; items?: any;
  sentDate: string | null; note: string | null; fileName: string | null; fileSize: number | null; createdAt: string;
  client?: { id: string; name: string } | null; creator?: { name: string } | null;
};
type Opt = { id: string; name: string };
type Row = { name: string; spec: string; qty: string; unitPrice: string; remark: string; photo: string };

const STATUSES = ["발송완료", "검토중", "수주", "무산"];
const statusColor: Record<string, string> = {
  발송완료: "bg-blue-100 text-blue-700", 검토중: "bg-amber-100 text-amber-700",
  수주: "bg-emerald-100 text-emerald-700", 무산: "bg-zinc-200 text-zinc-600",
};
const emptyRow = (): Row => ({ name: "", spec: "", qty: "", unitPrice: "", remark: "", photo: "" });

function fmtSize(n: number | null) {
  if (!n) return null;
  if (n < 1024) return `${n}B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)}KB`;
  return `${(n / 1024 / 1024).toFixed(1)}MB`;
}

export function ProposalManager({ proposals, clients, fixedClientId, docType }: {
  proposals: Proposal[]; clients: Opt[]; fixedClientId?: string; docType?: "PROPOSAL" | "INVOICE";
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const isInvoice = docType === "INVOICE";
  const docLabel = isInvoice ? "인보이스" : "제안서";

  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [rows, setRows] = useState<Row[]>([emptyRow()]);
  const [vatApplied, setVatApplied] = useState(isInvoice);
  const [depositPct, setDepositPct] = useState("30");
  const [currency, setCurrency] = useState("KRW");
  const [clientId, setClientId] = useState(fixedClientId ?? "");
  const [sentDate, setSentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [validUntil, setValidUntil] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [clientF, setClientF] = useState("all");
  const [statusF, setStatusF] = useState("all");

  const typed = docType ? proposals.filter((p) => (p.docType ?? "PROPOSAL") === docType) : proposals;
  const base = fixedClientId ? typed.filter((p) => p.client?.id === fixedClientId) : typed;
  const list = statusF === "all" ? base : base.filter((p) => p.status === statusF);
  const visible = clientF === "all" ? list : list.filter((p) => p.client?.id === clientF);
  const usedClients = Array.from(new Map(base.filter((p) => p.client).map((p) => [p.client!.id, p.client!.name])).entries());
  const stCount = (s: string) => base.filter((p) => p.status === s).length;

  const num = (s: string) => (s === "" ? 0 : Number(s) || 0);
  const supply = rows.reduce((a, r) => a + num(r.qty) * num(r.unitPrice), 0);
  const vat = vatApplied ? Math.round(supply * 0.1) : 0;
  const total = supply + vat;
  const depPct = Math.min(100, Math.max(0, num(depositPct) || 30));
  const deposit = Math.round((total * depPct) / 100);

  function setRow(i: number, key: keyof Row, v: string) {
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, [key]: v } : r)));
  }

  async function setPhoto(i: number, file: File | null) {
    if (!file) return;
    // 캔버스로 축소(가로 최대 320px)하여 data URL로 저장 → 문서에 임베드
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();
      reader.onload = () => { img.src = String(reader.result); };
      reader.onerror = reject;
      img.onload = () => {
        const max = 320;
        const scale = Math.min(1, max / img.width);
        const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
        const c = document.createElement("canvas");
        c.width = w; c.height = h;
        const ctx = c.getContext("2d");
        if (!ctx) return reject(new Error("canvas"));
        ctx.drawImage(img, 0, 0, w, h);
        resolve(c.toDataURL("image/jpeg", 0.8));
      };
      img.onerror = reject;
      reader.readAsDataURL(file);
    });
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, photo: dataUrl } : r)));
  }

  async function submit() {
    if (!title.trim()) return alert("제목을 입력하세요");
    setBusy(true);
    const fd = new FormData();
    fd.append("title", title);
    fd.append("docType", docType ?? "PROPOSAL");
    fd.append("depositPct", String(depPct));
    const items = rows.filter((r) => r.name.trim()).map((r) => ({ name: r.name.trim(), spec: r.spec.trim(), qty: num(r.qty), unitPrice: num(r.unitPrice), remark: r.remark.trim(), photo: r.photo || undefined }));
    if (items.length) {
      fd.append("items", JSON.stringify(items));
      fd.append("productName", items.map((i) => i.name).join(", ").slice(0, 100));
      fd.append("amount", String(total));
    }
    fd.append("vatApplied", String(vatApplied));
    fd.append("currency", currency);
    if (clientId) fd.append("clientId", clientId);
    if (sentDate) fd.append("sentDate", sentDate);
    if (validUntil) fd.append("validUntil", validUntil);
    if (note) fd.append("note", note);
    const file = fileRef.current?.files?.[0];
    if (file) fd.append("file", file);
    const res = await fetch("/api/proposals", { method: "POST", body: fd });
    setBusy(false);
    if (res.ok) {
      const j = await res.json().catch(() => null);
      setTitle(""); setRows([emptyRow()]); setClientId(fixedClientId ?? ""); setNote(""); setValidUntil("");
      if (fileRef.current) fileRef.current.value = "";
      setAdding(false); router.refresh();
      if (j?.id) router.push(`/quote/${j.id}`);
    } else alert("등록 실패");
  }
  async function setStatus(id: string, status: string) {
    const res = await fetch(`/api/proposals/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    if (res.ok) router.refresh();
  }
  async function issueInvoice(p: Proposal) {
    if (!confirm(`'${p.title}' 제안서로 인보이스를 발행할까요?\n(항목·업체·금액이 그대로 복사되며, 제안서는 '수주' 처리됩니다)`)) return;
    const res = await fetch(`/api/proposals/${p.id}/to-invoice`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
    if (res.ok) { const j = await res.json(); router.refresh(); router.push(`/quote/${j.id}`); }
    else { const j = await res.json().catch(() => ({})); alert(j.error || "발행 실패"); }
  }
  async function remove(id: string) {
    if (!confirm("삭제하시겠습니까?")) return;
    const res = await fetch(`/api/proposals/${id}`, { method: "DELETE" });
    if (res.ok) router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1.5">
          <button onClick={() => setStatusF("all")} className={cn("rounded-full border px-3 py-1 text-xs", statusF === "all" ? "bg-primary text-primary-foreground" : "bg-background")}>전체 {base.length}</button>
          {STATUSES.map((s) => (
            <button key={s} onClick={() => setStatusF(s)} className={cn("rounded-full border px-3 py-1 text-xs", statusF === s ? "bg-primary text-primary-foreground" : "bg-background")}>{s} {stCount(s)}</button>
          ))}
        </div>
        {!fixedClientId && usedClients.length > 0 && (
          <select value={clientF} onChange={(e) => setClientF(e.target.value)} className="h-8 rounded-md border bg-background px-2 text-xs">
            <option value="all">업체 전체</option>
            {usedClients.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
        )}
        <div className="flex-1" />
        <Button size="sm" onClick={() => setAdding((v) => !v)}>{adding ? <X className="mr-1 h-4 w-4" /> : <Plus className="mr-1 h-4 w-4" />}{adding ? "닫기" : `${docLabel} 작성`}</Button>
      </div>

      {adding && (
        <div className="space-y-2 rounded-md border bg-muted/30 p-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <Input placeholder={`제목 * (예: [코스메디크] 235ml 유리 토너용기 ${docLabel})`} value={title} onChange={(e) => setTitle(e.target.value)} className="h-9" />
            {!fixedClientId ? (
              <SearchableSelect options={clients} value={clientId} onChange={setClientId} placeholder="업체 선택" className="h-9" />
            ) : <div className="hidden sm:block" />}
          </div>

          <div className="overflow-x-auto rounded-md border bg-background">
            <table className="w-full text-xs">
              <thead className="bg-muted/40">
                <tr>
                  <th className="w-16 px-2 py-1.5">사진</th>
                  <th className="px-2 py-1.5 text-left">제품명 *</th>
                  <th className="w-32 px-2 py-1.5 text-left">재원 (사이즈·재질)</th>
                  <th className="w-16 px-2 py-1.5">수량</th>
                  <th className="w-24 px-2 py-1.5">단가</th>
                  <th className="w-24 px-2 py-1.5 text-right">금액</th>
                  <th className="w-40 px-2 py-1.5 text-left">비고 (사양)</th>
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-t align-top">
                    <td className="p-1">
                      <label className="flex h-12 w-12 cursor-pointer items-center justify-center overflow-hidden rounded border bg-muted/30 hover:bg-accent">
                        {r.photo ? <img src={r.photo} alt="" className="h-full w-full object-cover" /> : <span className="text-[10px] text-muted-foreground">사진</span>}
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => setPhoto(i, e.target.files?.[0] ?? null)} />
                      </label>
                    </td>
                    <td className="p-1"><input value={r.name} onChange={(e) => setRow(i, "name", e.target.value)} placeholder="제품명" className="w-full bg-transparent px-1 py-1 outline-none" /></td>
                    <td className="p-1"><textarea value={r.spec} onChange={(e) => setRow(i, "spec", e.target.value)} placeholder={"사이즈: \n재질: "} rows={2} className="w-full resize-y bg-transparent px-1 py-1 outline-none" /></td>
                    <td className="p-1"><input type="number" value={r.qty} onChange={(e) => setRow(i, "qty", e.target.value)} className="w-full bg-transparent px-1 py-1 text-right outline-none" /></td>
                    <td className="p-1"><input type="number" step="any" value={r.unitPrice} onChange={(e) => setRow(i, "unitPrice", e.target.value)} className="w-full bg-transparent px-1 py-1 text-right outline-none" /></td>
                    <td className="p-1 pt-2 text-right tabular-nums">{(num(r.qty) * num(r.unitPrice)).toLocaleString()}</td>
                    <td className="p-1"><textarea value={r.remark} onChange={(e) => setRow(i, "remark", e.target.value)} placeholder="옵션·후가공 등" rows={2} className="w-full resize-y bg-transparent px-1 py-1 outline-none" /></td>
                    <td className="p-1 pt-2 text-center">
                      {rows.length > 1 && <button onClick={() => setRows((rs) => rs.filter((_, idx) => idx !== i))} className="text-muted-foreground hover:text-destructive"><X className="h-3.5 w-3.5" /></button>}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t bg-muted/20 font-medium">
                <tr><td colSpan={5} className="px-2 py-1.5 text-right">합계</td><td className="px-2 py-1.5 text-right tabular-nums">{supply.toLocaleString()}</td><td colSpan={2} /></tr>
                {vatApplied && <>
                  <tr><td colSpan={5} className="px-2 py-1.5 text-right">부가가치세</td><td className="px-2 py-1.5 text-right tabular-nums">{vat.toLocaleString()}</td><td colSpan={2} /></tr>
                  <tr className="font-bold"><td colSpan={5} className="px-2 py-1.5 text-right">합계금액</td><td className="px-2 py-1.5 text-right tabular-nums">{total.toLocaleString()}</td><td colSpan={2} /></tr>
                </>}
                {isInvoice && <>
                  <tr className="bg-yellow-100 font-bold"><td colSpan={5} className="px-2 py-1.5 text-right">계약금 ({depPct}%)</td><td className="px-2 py-1.5 text-right tabular-nums">{deposit.toLocaleString()}</td><td colSpan={2} /></tr>
                  <tr><td colSpan={5} className="px-2 py-1.5 text-right">잔금 ({100 - depPct}%)</td><td className="px-2 py-1.5 text-right tabular-nums">{(total - deposit).toLocaleString()}</td><td colSpan={2} /></tr>
                </>}
              </tfoot>
            </table>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button onClick={() => setRows((rs) => [...rs, emptyRow()])} className="flex items-center gap-1 text-xs text-primary hover:underline"><Plus className="h-3.5 w-3.5" />항목 추가</button>
            <label className="flex items-center gap-1.5 text-xs"><input type="checkbox" checked={vatApplied} onChange={(e) => setVatApplied(e.target.checked)} />부가세 10% {isInvoice ? "포함" : "적용"}</label>
            {isInvoice && (
              <label className="flex items-center gap-1 text-xs">계약금 비율
                <input type="number" value={depositPct} onChange={(e) => setDepositPct(e.target.value)} className="h-7 w-14 rounded border bg-background px-1 text-right" />%
              </label>
            )}
            <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="h-8 rounded-md border bg-background px-2 text-xs">
              <option>KRW</option><option>RMB</option><option>USD</option>
            </select>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <div className="flex items-center gap-1">
              <span className="w-14 shrink-0 text-xs text-muted-foreground">작성일</span>
              <Input type="date" value={sentDate} onChange={(e) => setSentDate(e.target.value)} className="h-9" />
            </div>
            <div className="flex items-center gap-1">
              <span className="w-14 shrink-0 text-xs text-muted-foreground">유효기간</span>
              <Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} className="h-9" />
            </div>
          </div>
          <Input placeholder="추가 참고사항 (문서 하단 ※ 표시, 선택)" value={note} onChange={(e) => setNote(e.target.value)} className="h-9" />
          <div className="flex items-center gap-2">
            <input ref={fileRef} type="file" className="h-9 flex-1 rounded-md border bg-background px-2 py-1.5 text-sm file:mr-2 file:rounded file:border-0 file:bg-accent file:px-2 file:py-1 file:text-xs" />
            <Button size="sm" variant="outline" onClick={() => setAdding(false)}>취소</Button>
            <Button size="sm" onClick={submit} disabled={busy}>{busy ? "등록 중..." : `등록 후 ${docLabel} 보기`}</Button>
          </div>
        </div>
      )}

      {visible.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
          {isInvoice ? <Receipt className="h-8 w-8 opacity-40" /> : <Send className="h-8 w-8 opacity-40" />}
          <p className="text-sm">등록된 {docLabel}가 없습니다.</p>
        </div>
      )}

      <div className="divide-y rounded-md border">
        {visible.map((p) => (
          <div key={p.id} className="flex items-start gap-3 px-3 py-2.5">
            {(p.docType ?? "PROPOSAL") === "INVOICE" ? <Receipt className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" /> : <Send className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" />}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Link href={`/quote/${p.id}`} className="text-sm font-medium hover:underline">{p.title}</Link>
                {p.client && !fixedClientId && <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[11px] text-violet-700">{p.client.name}</span>}
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                {p.productName && <span>품목: {p.productName}</span>}
                {p.amount != null && <span className="font-medium text-foreground">{fmtUnit(Number(p.amount))} {p.currency ?? "KRW"}</span>}
                {p.sentDate && <span>작성 {new Date(p.sentDate).toISOString().slice(0, 10)}</span>}
                {p.sentTo && <span className="flex items-center gap-0.5 text-blue-600"><Mail className="h-3 w-3" />{p.sentTo}{p.sentAt ? ` (${new Date(p.sentAt).toISOString().slice(0, 10)})` : ""}</span>}
                {p.creator?.name && <span>{p.creator.name}</span>}
              </div>
              {p.note && <p className="mt-0.5 text-xs text-muted-foreground">{p.note}</p>}
              {p.fileName && (
                <a href={`/api/proposals/${p.id}/download`} target="_blank" rel="noreferrer" className="mt-1 flex w-fit items-center gap-1 text-xs text-blue-600 hover:underline">
                  <FileText className="h-3 w-3" />{p.fileName} {fmtSize(p.fileSize) && `(${fmtSize(p.fileSize)})`}
                </a>
              )}
            </div>
            {(p.docType ?? "PROPOSAL") === "PROPOSAL" && (() => {
              const inv = proposals.find((x) => (x.docType ?? "PROPOSAL") === "INVOICE" && x.sourceId === p.id);
              return inv ? (
                <Link href={`/quote/${inv.id}`} className="flex shrink-0 items-center gap-1 rounded-full bg-rose-100 px-2 py-1 text-[11px] font-medium text-rose-700 hover:bg-rose-200" title="발행된 인보이스 보기"><Receipt className="h-3 w-3" />인보이스</Link>
              ) : (
                <button onClick={() => issueInvoice(p)} className="flex shrink-0 items-center gap-1 rounded-full border border-rose-300 px-2 py-1 text-[11px] font-medium text-rose-600 hover:bg-rose-50" title="이 제안서로 인보이스 발행"><Receipt className="h-3 w-3" />인보이스 발행</button>
              );
            })()}
            <ProposalEditDialog proposal={p as any} clients={clients} />
            <Link href={`/quote/${p.id}`} className="shrink-0 rounded p-1 text-muted-foreground hover:bg-accent" title="문서 보기/인쇄/메일"><Printer className="h-3.5 w-3.5" /></Link>
            <select value={p.status} onChange={(e) => setStatus(p.id, e.target.value)} className={cn("shrink-0 rounded-full border-0 px-2 py-1 text-xs font-medium", statusColor[p.status] ?? "bg-muted")}>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            {p.fileName && <a href={`/api/proposals/${p.id}/download`} className="shrink-0 rounded p-1 text-muted-foreground hover:bg-accent"><Download className="h-3.5 w-3.5" /></a>}
            <button onClick={() => remove(p.id)} className="shrink-0 rounded p-1 text-muted-foreground hover:bg-accent hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}
