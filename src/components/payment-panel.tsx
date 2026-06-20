"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fmtDate, cn } from "@/lib/utils";
import { Trash2 } from "lucide-react";

type Payment = { id: string; type: "DEPOSIT" | "BALANCE"; amount: any; receivedAt: string | Date; method?: string | null; account?: string | null; memo?: string | null };
const TYPE_LABEL = { DEPOSIT: "계약금", BALANCE: "잔금" } as const;
const METHODS = ["현금", "계좌이체", "위챗", "스프", "카드"];
const won = (v: any) => Number(v).toLocaleString() + "원";
const inpCls = "h-9 rounded-md border border-input bg-background px-3 text-sm";

export function PaymentPanel({ projectId, payments }: { projectId: string; payments: Payment[] }) {
  const router = useRouter();
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
  const [type, setType] = useState<"DEPOSIT" | "BALANCE">("DEPOSIT");
  const [amount, setAmount] = useState("");
  const [receivedAt, setReceivedAt] = useState(today);
  const [method, setMethod] = useState("");
  const [account, setAccount] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function add() {
    if (!amount || Number(amount) <= 0) { setErr("금액을 입력하세요."); return; }
    setBusy(true); setErr("");
    const res = await fetch(`/api/projects/${projectId}/payments`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, amount: Number(amount), receivedAt, method: method || null, account: account || null }),
    });
    setBusy(false);
    if (!res.ok) { setErr("등록에 실패했습니다."); return; }
    setAmount(""); setAccount(""); router.refresh();
  }
  async function remove(id: string) {
    if (!confirm("이 수금내역을 삭제하시겠습니까?")) return;
    await fetch(`/api/projects/${projectId}/payments?paymentId=${id}`, { method: "DELETE" });
    router.refresh();
  }

  const depSum = payments.filter((p) => p.type === "DEPOSIT").reduce((a, p) => a + Number(p.amount), 0);
  const balSum = payments.filter((p) => p.type === "BALANCE").reduce((a, p) => a + Number(p.amount), 0);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-md border p-2 text-center">
          <div className="text-xs text-muted-foreground">계약금 합계</div>
          <div className="font-semibold">{depSum.toLocaleString()}원</div>
        </div>
        <div className="rounded-md border p-2 text-center">
          <div className="text-xs text-muted-foreground">잔금 합계</div>
          <div className="font-semibold">{balSum.toLocaleString()}원</div>
        </div>
      </div>

      <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">구분</label>
            <select value={type} onChange={(e) => setType(e.target.value as any)} className={cn(inpCls, "w-full")}>
              <option value="DEPOSIT">계약금</option>
              <option value="BALANCE">잔금</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">금액(원)</label>
            <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" className="h-9" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">수령일</label>
            <Input type="date" value={receivedAt} onChange={(e) => setReceivedAt(e.target.value)} className="h-9" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">결재방식</label>
            <select value={method} onChange={(e) => setMethod(e.target.value)} className={cn(inpCls, "w-full")}>
              <option value="">선택 안함</option>
              {METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label className="mb-1 block text-xs text-muted-foreground">결재계좌 정보</label>
            <Input value={account} onChange={(e) => setAccount(e.target.value)} placeholder="입금 계좌/지급처 (선택)" className="h-9" />
          </div>
        </div>
        {err && <p className="text-xs text-destructive">{err}</p>}
        <div className="flex justify-end">
          <Button onClick={add} disabled={busy} size="sm">{busy ? "등록 중..." : "수금 등록"}</Button>
        </div>
      </div>

      <div className="space-y-1.5">
        {payments.length === 0 && <p className="text-sm text-muted-foreground">등록된 수금내역이 없습니다.</p>}
        {payments.map((p) => (
          <div key={p.id} className="group rounded-md border px-3 py-2 text-sm">
            <div className="flex items-center justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${p.type === "DEPOSIT" ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700"}`}>{TYPE_LABEL[p.type]}</span>
                <span className="font-medium">{won(p.amount)}</span>
                <span className="text-xs text-muted-foreground">· {fmtDate(p.receivedAt)}</span>
                {p.method && <span className="rounded bg-accent px-1.5 py-0.5 text-xs text-foreground">{p.method}</span>}
              </div>
              <button onClick={() => remove(p.id)} className="opacity-0 transition-opacity group-hover:opacity-100">
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </button>
            </div>
            {p.account && <p className="mt-0.5 text-xs text-muted-foreground">계좌: {p.account}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
