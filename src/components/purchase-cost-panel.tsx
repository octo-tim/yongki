"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { fmtUnit } from "@/lib/utils";
import { Plus, Trash2 } from "lucide-react";

type Item = { id: string; name: string; amount: any };

export function PurchaseCostPanel({ projectId, items, currency = "RMB", productAmount = 0 }: {
  projectId: string; items: Item[]; currency?: string; productAmount?: number;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);

  const extrasSum = items.reduce((a, i) => a + Number(i.amount ?? 0), 0);
  const total = productAmount + extrasSum;

  async function add() {
    if (!name.trim()) return;
    setBusy(true);
    await fetch(`/api/projects/${projectId}/costs`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, amount: amount || 0 }),
    });
    setBusy(false); setName(""); setAmount(""); router.refresh();
  }
  async function del(id: string) {
    await fetch(`/api/projects/${projectId}/costs?costId=${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="space-y-3 text-sm">
      <p className="text-xs text-muted-foreground">제품금액(수량×단가) 외에 공장에 지급하는 비용(운임·금형비·검품비 등)을 항목별로 추가합니다.</p>

      <div className="overflow-hidden rounded-md border">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
              <th className="px-3 py-2 font-semibold">항목</th>
              <th className="px-3 py-2 text-right font-semibold">금액 ({currency})</th>
              <th className="w-10 px-2 py-2"></th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b">
              <td className="px-3 py-2 text-muted-foreground">제품금액 (수량×단가)</td>
              <td className="px-3 py-2 text-right tabular-nums">{fmtUnit(productAmount)}</td>
              <td></td>
            </tr>
            {items.map((it) => (
              <tr key={it.id} className="group border-b last:border-0">
                <td className="px-3 py-2">{it.name}</td>
                <td className="px-3 py-2 text-right tabular-nums">{fmtUnit(Number(it.amount ?? 0))}</td>
                <td className="px-2 py-2 text-right">
                  <button onClick={() => del(it.id)} className="text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr className="border-b last:border-0"><td colSpan={3} className="px-3 py-2 text-center text-xs text-muted-foreground">추가 비용 없음</td></tr>
            )}
          </tbody>
          <tfoot>
            <tr className="bg-muted/40 font-semibold">
              <td className="px-3 py-2">구매 합계</td>
              <td className="px-3 py-2 text-right tabular-nums text-orange-700">{fmtUnit(total)} {currency}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="flex items-end gap-2">
        <div className="flex-1">
          <label className="mb-1 block text-xs text-muted-foreground">비용 항목</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 운임 / 금형비 / 검품비" className="h-9" />
        </div>
        <div className="w-36">
          <label className="mb-1 block text-xs text-muted-foreground">금액</label>
          <Input type="number" step="any" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="h-9 text-right" />
        </div>
        <Button onClick={add} disabled={busy} className="h-9"><Plus className="h-4 w-4" /> 추가</Button>
      </div>
    </div>
  );
}
