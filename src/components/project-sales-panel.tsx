"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Receipt, Printer, X, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

type Doc = {
  id: string; title: string; docType: string | null; invoiceKind: string | null;
  amount: any; currency: string | null; status: string; sentDate: string | null; sentTo: string | null;
};
const won = (n: number) => n.toLocaleString("ko-KR");
const statusColor: Record<string, string> = { 발송완료: "bg-blue-100 text-blue-700", 검토중: "bg-amber-100 text-amber-700", 수주: "bg-emerald-100 text-emerald-700", 무산: "bg-zinc-200 text-zinc-600" };

export function ProjectSalesPanel({ projectId, productName, docs }: { projectId: string; productName: string; docs: Doc[] }) {
  const router = useRouter();
  const [form, setForm] = useState<null | "DEPOSIT" | "BALANCE" | "FULL">(null);
  const [amount, setAmount] = useState("");
  const [vatApplied, setVatApplied] = useState(true);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const proposals = docs.filter((d) => (d.docType ?? "PROPOSAL") === "PROPOSAL");
  const invoices = docs.filter((d) => d.docType === "INVOICE");
  const kindKo = (k: string | null) => (k === "DEPOSIT" ? "계약금" : k === "BALANCE" ? "잔금" : k === "FULL" ? "전체" : "");

  async function issue(kind: "DEPOSIT" | "BALANCE" | "FULL") {
    const amt = Number(amount || 0);
    if (!amt) return alert("금액을 입력하세요");
    setBusy(true);
    const res = await fetch(`/api/projects/${projectId}/issue-invoice`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, amount: amt, vatApplied, note }),
    });
    setBusy(false);
    if (res.ok) { const j = await res.json(); setForm(null); setAmount(""); setNote(""); router.refresh(); router.push(`/quote/${j.id}`); }
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
                <Link href={`/quote/${d.id}`} className="rounded p-1 text-muted-foreground hover:bg-accent"><Printer className="h-3.5 w-3.5" /></Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 보낸 인보이스 */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold"><Receipt className="h-4 w-4 text-rose-600" />보낸 인보이스 ({invoices.length})</h3>
          <div className="flex gap-1.5">
            <Button size="sm" variant="outline" onClick={() => setForm(form === "DEPOSIT" ? null : "DEPOSIT")}>계약금 발행</Button>
            <Button size="sm" variant="outline" onClick={() => setForm(form === "BALANCE" ? null : "BALANCE")}>잔금 발행</Button>
            <Button size="sm" variant="outline" onClick={() => setForm(form === "FULL" ? null : "FULL")}>전체 발행</Button>
          </div>
        </div>

        {form && (
          <div className="mb-2 space-y-2 rounded-md border bg-muted/30 p-3">
            <p className="text-xs font-medium">{productName}_{form === "DEPOSIT" ? "계약금" : form === "BALANCE" ? "잔금" : "전체"} 인보이스 발행</p>
            <div className="flex items-center gap-2">
              <Input type="number" placeholder="금액 입력" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-9" />
              <label className="flex shrink-0 items-center gap-1 text-xs"><input type="checkbox" checked={vatApplied} onChange={(e) => setVatApplied(e.target.checked)} />부가세 10%</label>
            </div>
            <Input placeholder="비고 (선택)" value={note} onChange={(e) => setNote(e.target.value)} className="h-9" />
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => setForm(null)}>취소</Button>
              <Button size="sm" onClick={() => issue(form)} disabled={busy}>{busy ? "발행 중..." : "발행 후 보기"}</Button>
            </div>
          </div>
        )}

        {invoices.length === 0 ? <p className="text-xs text-muted-foreground">발행한 인보이스가 없습니다.</p> : (
          <div className="divide-y rounded-md border">
            {invoices.map((d) => (
              <div key={d.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                {d.invoiceKind && <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium", d.invoiceKind === "DEPOSIT" ? "bg-yellow-100 text-yellow-800" : d.invoiceKind === "BALANCE" ? "bg-orange-100 text-orange-700" : "bg-rose-100 text-rose-700")}>{kindKo(d.invoiceKind)}</span>}
                <Link href={`/quote/${d.id}`} className="flex-1 truncate font-medium hover:underline">{d.title}</Link>
                {d.amount != null && <span className="text-xs text-muted-foreground">{won(Number(d.amount))} {d.currency ?? "KRW"}</span>}
                {d.sentTo && <span className="text-[11px] text-blue-600">발송됨</span>}
                <Link href={`/quote/${d.id}`} className="rounded p-1 text-muted-foreground hover:bg-accent"><Printer className="h-3.5 w-3.5" /></Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
