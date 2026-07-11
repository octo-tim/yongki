"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Receipt, Printer, FileSpreadsheet, FlaskConical, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Doc = {
  id: string; title: string; docType: string | null; invoiceKind: string | null;
  amount: any; currency: string | null; status: string; sentDate: string | null; sentTo: string | null;
};
type InvRow = { name: string; spec: string; qty: string; unitPrice: string; remark: string };
const emptyInv = (): InvRow => ({ name: "", spec: "", qty: "", unitPrice: "", remark: "" });
const won = (n: number) => n.toLocaleString("ko-KR");
const statusColor: Record<string, string> = { 발송완료: "bg-blue-100 text-blue-700", 검토중: "bg-amber-100 text-amber-700", 수주: "bg-emerald-100 text-emerald-700", 무산: "bg-zinc-200 text-zinc-600" };

// 프로젝트 상세의 영업(제안서·인보이스) — 발행 내역 조회 + 샘플인보이스 발행.
// 제안서 발행은 영업관리 화면, 계약금/중도금/잔금 인보이스는 결재관리 발행 아이콘에서.
export function ProjectSalesPanel({ projectId, productName, docs }: { projectId: string; productName?: string; docs: Doc[] }) {
  const router = useRouter();
  const proposals = docs.filter((d) => (d.docType ?? "PROPOSAL") === "PROPOSAL");
  const invoices = docs.filter((d) => d.docType === "INVOICE");
  const kindKo = (k: string | null) => (k === "DEPOSIT" ? "계약금" : k === "INTERIM" ? "중도금" : k === "BALANCE" ? "잔금" : k === "FULL" ? "전체" : k === "SAMPLE" ? "샘플" : "");
  const kindColor = (k: string | null) =>
    k === "DEPOSIT" ? "bg-yellow-100 text-yellow-800" : k === "INTERIM" ? "bg-sky-100 text-sky-700" :
    k === "BALANCE" ? "bg-orange-100 text-orange-700" : k === "SAMPLE" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700";

  // 샘플인보이스 발행 다이얼로그
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [vat, setVat] = useState(true);
  const [note, setNote] = useState("");
  const [invRows, setInvRows] = useState<InvRow[]>([emptyInv()]);
  const [busy, setBusy] = useState(false);
  const setInvRow = (i: number, f: keyof InvRow, v: string) => setInvRows((rs) => rs.map((r, idx) => idx === i ? { ...r, [f]: v } : r));

  async function issueSample() {
    const items = invRows.filter((r) => r.name.trim()).map((r) => ({
      name: r.name.trim(), spec: r.spec.trim(), qty: Number(r.qty) || 0, unitPrice: Number(r.unitPrice) || 0, remark: r.remark.trim(),
    }));
    const amt = Number(amount) || 0;
    if (!amt && items.length === 0) return alert("금액 또는 항목을 입력하세요");
    setBusy(true);
    const res = await fetch(`/api/projects/${projectId}/issue-invoice`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "SAMPLE", amount: amt, items, vatApplied: vat, note }),
    });
    setBusy(false);
    if (res.ok) { const j = await res.json(); setOpen(false); router.refresh(); router.push(`/quote/${j.id}`); }
    else { const j = await res.json().catch(() => ({})); alert(j.error || "발행 실패"); }
  }

  return (
    <div className="space-y-4">
      {/* 보낸 제안서 */}
      <div>
        <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><Send className="h-4 w-4 text-violet-600" />보낸 제안서 ({proposals.length})</h3>
        {proposals.length === 0 ? <p className="text-xs text-muted-foreground">발송한 제안서가 없습니다.</p> : (
          <div className="divide-y rounded-md border">
            {proposals.map((d) => (
              <div key={d.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                <Link href={`/quote/${d.id}`} className="flex-1 truncate font-medium hover:underline">{d.title}</Link>
                {d.amount != null && <span className="text-xs text-muted-foreground">{won(Number(d.amount))} {d.currency ?? "KRW"}</span>}
                <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", statusColor[d.status] ?? "bg-muted")}>{d.status}</span>
                <Link href={`/quote/${d.id}`} className="rounded p-1 text-muted-foreground hover:bg-accent" title="보기/인쇄"><Printer className="h-3.5 w-3.5" /></Link>
                <a href={`/api/proposals/${d.id}/excel`} className="rounded p-1 text-emerald-600 hover:bg-accent" title="엑셀 다운로드"><FileSpreadsheet className="h-3.5 w-3.5" /></a>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 보낸 인보이스 */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold"><Receipt className="h-4 w-4 text-rose-600" />보낸 인보이스 ({invoices.length})</h3>
          <button onClick={() => { setOpen(true); setAmount(""); setVat(true); setNote(""); setInvRows([emptyInv()]); }}
            className="flex items-center gap-1 rounded-md border border-emerald-300 px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50" title="샘플인보이스 발행">
            <FlaskConical className="h-3.5 w-3.5" />샘플인보이스 발행
          </button>
        </div>
        {invoices.length === 0 ? <p className="text-xs text-muted-foreground">발행한 인보이스가 없습니다. (계약금·중도금·잔금은 결재관리 판매 행에서, 샘플은 위 버튼으로 발행)</p> : (
          <div className="divide-y rounded-md border">
            {invoices.map((d) => (
              <div key={d.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                {d.invoiceKind && <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium inline-flex items-center gap-0.5", kindColor(d.invoiceKind))}>{d.invoiceKind === "SAMPLE" && <FlaskConical className="h-3 w-3" />}{kindKo(d.invoiceKind)}</span>}
                <Link href={`/quote/${d.id}`} className="flex-1 truncate font-medium hover:underline">{d.title}</Link>
                {d.amount != null && <span className="text-xs text-muted-foreground">{won(Number(d.amount))} {d.currency ?? "KRW"}</span>}
                {d.sentTo && <span className="text-[11px] text-blue-600">발송됨</span>}
                <Link href={`/quote/${d.id}`} className="rounded p-1 text-muted-foreground hover:bg-accent" title="보기/인쇄"><Printer className="h-3.5 w-3.5" /></Link>
                <a href={`/api/proposals/${d.id}/excel`} className="rounded p-1 text-emerald-600 hover:bg-accent" title="엑셀 다운로드"><FileSpreadsheet className="h-3.5 w-3.5" /></a>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 샘플인보이스 발행 다이얼로그 */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setOpen(false)}>
          <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-background p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-1.5 text-base font-semibold"><FlaskConical className="h-4 w-4 text-emerald-600" />{productName ? `${productName}_` : ""}샘플 인보이스 발행</h3>
              <button onClick={() => setOpen(false)} className="rounded p-1 hover:bg-accent"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <label className="w-20 shrink-0 text-sm text-muted-foreground">청구금액</label>
                <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="금액 (항목 입력 시 자동 합계)" className="h-9" />
                <label className="flex shrink-0 items-center gap-1 text-xs"><input type="checkbox" checked={vat} onChange={(e) => setVat(e.target.checked)} />부가세 10%</label>
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-sm font-medium">항목 (샘플비·운송료·택배비 등)</span>
                  <button onClick={() => setInvRows((rs) => [...rs, emptyInv()])} className="flex items-center gap-1 text-xs text-primary hover:underline"><Plus className="h-3.5 w-3.5" />항목 추가</button>
                </div>
                <div className="space-y-1.5">
                  {invRows.map((r, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <Input value={r.name} onChange={(e) => setInvRow(i, "name", e.target.value)} placeholder="제품명/항목" className="h-8 flex-1" />
                      <Input value={r.spec} onChange={(e) => setInvRow(i, "spec", e.target.value)} placeholder="규격" className="h-8 w-20" />
                      <Input type="number" value={r.qty} onChange={(e) => setInvRow(i, "qty", e.target.value)} placeholder="수량" className="h-8 w-16" />
                      <Input type="number" value={r.unitPrice} onChange={(e) => setInvRow(i, "unitPrice", e.target.value)} placeholder="단가" className="h-8 w-24" />
                      <Input value={r.remark} onChange={(e) => setInvRow(i, "remark", e.target.value)} placeholder="비고" className="h-8 w-20" />
                      {invRows.length > 1 && <button onClick={() => setInvRows((rs) => rs.filter((_, idx) => idx !== i))} className="text-muted-foreground hover:text-destructive"><X className="h-3.5 w-3.5" /></button>}
                    </div>
                  ))}
                </div>
              </div>
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="비고 (선택)" className="h-9" />
              <div className="flex justify-end gap-2 pt-1">
                <Button size="sm" variant="outline" onClick={() => setOpen(false)}>취소</Button>
                <Button size="sm" onClick={issueSample} disabled={busy}>{busy ? "발행 중..." : "발행 후 보기"}</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
