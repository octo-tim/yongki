"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, X, Plus, History, Receipt, FileText } from "lucide-react";

type Item = { name: string; spec?: string; qty: number; unitPrice: number; remark?: string; photo?: string };
type Proposal = {
  id: string; title: string; currency: string | null; depositPct?: number | null; vatApplied?: boolean | null;
  items?: any; note: string | null; revisionNo?: number | null;
};
type Rev = { id: string; revisionNo: number; title: string; amount: any; currency: string | null; editedByName: string | null; invoiceId: string | null; createdAt: string };
type Row = { name: string; spec: string; qty: string; unitPrice: string; remark: string; photo: string };

const toRow = (it: Item): Row => ({ name: it.name ?? "", spec: it.spec ?? "", qty: String(it.qty ?? ""), unitPrice: String(it.unitPrice ?? ""), remark: it.remark ?? "", photo: it.photo ?? "" });
const emptyRow = (): Row => ({ name: "", spec: "", qty: "", unitPrice: "", remark: "", photo: "" });

export function ProposalEditDialog({ proposal }: { proposal: Proposal }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(proposal.title);
  const [note, setNote] = useState(proposal.note ?? "");
  const [vatApplied, setVatApplied] = useState(proposal.vatApplied ?? true);
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

  function setRow(i: number, k: keyof Row, v: string) { setRows((rs) => rs.map((r, idx) => idx === i ? { ...r, [k]: v } : r)); }

  async function save() {
    if (!title.trim()) return alert("제목을 입력하세요");
    setBusy(true);
    const items = rows.filter((r) => r.name.trim()).map((r) => ({ name: r.name.trim(), spec: r.spec.trim(), qty: num(r.qty), unitPrice: num(r.unitPrice), remark: r.remark.trim(), photo: r.photo || undefined }));
    const res = await fetch(`/api/proposals/${proposal.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ edit: { title, note, vatApplied, items, currency: proposal.currency } }),
    });
    setBusy(false);
    if (res.ok) { setOpen(false); router.refresh(); }
    else alert("수정 실패");
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="shrink-0 rounded p-1 text-muted-foreground hover:bg-accent" title="제안서 수정"><Pencil className="h-3.5 w-3.5" /></button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setOpen(false)}>
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-card p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold">제안서 수정 <span className="text-xs font-normal text-muted-foreground">(현재 v{proposal.revisionNo ?? 1})</span></h3>
              <button onClick={() => setOpen(false)}><X className="h-5 w-5" /></button>
            </div>
            <p className="mb-3 rounded-md bg-amber-50 px-2 py-1.5 text-xs text-amber-800">저장하면 현재 내용이 <b>v{proposal.revisionNo ?? 1}</b>로 이력에 보관되고, 새 버전이 됩니다.</p>

            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="제목" className="mb-2 h-9" />
            <div className="mb-2 overflow-x-auto rounded-md border">
              <table className="w-full text-xs">
                <thead className="bg-muted/40"><tr>
                  <th className="px-2 py-1.5 text-left">제품명</th><th className="px-2 py-1.5">재원</th><th className="w-14 px-2 py-1.5">수량</th><th className="w-20 px-2 py-1.5">단가</th><th className="px-2 py-1.5">비고</th><th className="w-6"></th>
                </tr></thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} className="border-t align-top">
                      <td className="p-1"><input value={r.name} onChange={(e) => setRow(i, "name", e.target.value)} className="w-full bg-transparent px-1 py-1 outline-none" /></td>
                      <td className="p-1"><textarea value={r.spec} onChange={(e) => setRow(i, "spec", e.target.value)} rows={2} className="w-full resize-y bg-transparent px-1 py-1 outline-none" /></td>
                      <td className="p-1"><input type="number" value={r.qty} onChange={(e) => setRow(i, "qty", e.target.value)} className="w-full bg-transparent px-1 py-1 text-right outline-none" /></td>
                      <td className="p-1"><input type="number" step="any" value={r.unitPrice} onChange={(e) => setRow(i, "unitPrice", e.target.value)} className="w-full bg-transparent px-1 py-1 text-right outline-none" /></td>
                      <td className="p-1"><textarea value={r.remark} onChange={(e) => setRow(i, "remark", e.target.value)} rows={2} className="w-full resize-y bg-transparent px-1 py-1 outline-none" /></td>
                      <td className="p-1 pt-2 text-center">{rows.length > 1 && <button onClick={() => setRows((rs) => rs.filter((_, idx) => idx !== i))}><X className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" /></button>}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t bg-muted/20 font-medium">
                  <tr><td colSpan={3} className="px-2 py-1 text-right">합계</td><td colSpan={2} className="px-2 py-1 text-right">{supply.toLocaleString()}</td><td /></tr>
                  {vatApplied && <tr><td colSpan={3} className="px-2 py-1 text-right">부가세</td><td colSpan={2} className="px-2 py-1 text-right">{vat.toLocaleString()}</td><td /></tr>}
                  <tr className="font-bold"><td colSpan={3} className="px-2 py-1 text-right">합계금액</td><td colSpan={2} className="px-2 py-1 text-right">{total.toLocaleString()}</td><td /></tr>
                </tfoot>
              </table>
            </div>
            <div className="mb-2 flex items-center gap-3">
              <button onClick={() => setRows((rs) => [...rs, emptyRow()])} className="flex items-center gap-1 text-xs text-primary hover:underline"><Plus className="h-3.5 w-3.5" />항목 추가</button>
              <label className="flex items-center gap-1.5 text-xs"><input type="checkbox" checked={vatApplied} onChange={(e) => setVatApplied(e.target.checked)} />부가세 10%</label>
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
