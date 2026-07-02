"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fmtUnit } from "@/lib/utils";

type Pay = { id: string; side: string; type: string; amount: any; receivedAt: any; method: string | null; memo: string | null };
type Row = { amount: string; receivedAt: string; method: string; memo: string };

const METHODS = ["통장이체", "위쳇결재", "쯔프바오", "기타"];
const selCls = "h-9 w-full rounded-md border border-input bg-background px-2 text-sm";
const dInput = (v: any) => (v ? new Date(v).toISOString().slice(0, 10) : "");

function rowFrom(p?: Pay): Row {
  return { amount: p?.amount != null ? String(Number(p.amount)) : "", receivedAt: dInput(p?.receivedAt), method: p?.method ?? "", memo: p?.memo ?? "" };
}

export function PaymentManager({ projectId, payments, totals }: {
  projectId: string; payments: Pay[];
  totals?: { salesTotal: number; salesCurrency: string; purchaseTotal: number; purchaseCurrency: string };
}) {
  const router = useRouter();
  const find = (side: string, type: string) => payments.find((p) => p.side === side && p.type === type);
  const init: Record<string, Row> = {};
  for (const side of ["SALES", "PURCHASE"]) for (const type of ["DEPOSIT", "INTERIM", "BALANCE"]) init[`${side}_${type}`] = rowFrom(find(side, type));
  const [rows, setRows] = useState<Record<string, Row>>(init);
  const [busy, setBusy] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");

  const set = (key: string, field: keyof Row, v: string) => setRows((s) => ({ ...s, [key]: { ...s[key], [field]: v } }));

  async function saveSide(side: string) {
    setBusy(true); setSavedMsg("");
    for (const type of ["DEPOSIT", "INTERIM", "BALANCE"]) {
      const r = rows[`${side}_${type}`];
      await fetch(`/api/projects/${projectId}/payments`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ side, type, amount: r.amount, receivedAt: r.receivedAt, method: r.method, memo: r.memo }),
      });
    }
    setBusy(false); setSavedMsg(side); router.refresh();
    setTimeout(() => setSavedMsg(""), 1500);
  }

  const sideTotal = (side: string) =>
    ["DEPOSIT", "INTERIM", "BALANCE"].reduce((a, t) => a + (Number(rows[`${side}_${t}`].amount) || 0), 0);

  return (
    <div className="space-y-4">
      {([["SALES", "판매", "업체"], ["PURCHASE", "구매", "공장"]] as const).map(([side, ko, who]) => {
        const totalAmt = side === "SALES" ? totals?.salesTotal : totals?.purchaseTotal;
        const totalCcy = side === "SALES" ? (totals?.salesCurrency ?? "RMB") : (totals?.purchaseCurrency ?? "RMB");
        const paid = ["DEPOSIT", "INTERIM", "BALANCE"].reduce((a, t) => a + (Number(rows[`${side}_${t}`].amount) || 0), 0);
        return (
        <div key={side} className="rounded-lg border">
          <div className="flex items-center justify-between border-b bg-muted/30 px-3 py-2">
            <div className="flex items-center gap-2">
              <span className={`rounded px-1.5 py-0.5 text-xs font-semibold ${side === "SALES" ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700"}`}>{ko}</span>
              <span className="text-xs text-muted-foreground">({who})</span>
            </div>
            <Button size="sm" variant="outline" onClick={() => saveSide(side)} disabled={busy}>
              {savedMsg === side ? "저장됨 ✓" : "저장"}
            </Button>
          </div>
          {/* 전체금액 (제품정보 자동 반영) */}
          <div className="flex items-center justify-between border-b px-3 py-2 text-sm">
            <span className="font-semibold">전체금액</span>
            <span className="text-base font-bold">{totalAmt != null ? `${fmtUnit(totalAmt)} ${totalCcy}` : "-"}
              <span className="ml-2 text-xs font-normal text-muted-foreground">결재합 {fmtUnit(paid)}</span>
            </span>
          </div>
          <div className="divide-y">
            {([["DEPOSIT", "계약금"], ["INTERIM", "중도금"], ["BALANCE", "잔금"]] as const).map(([type, tko]) => {
              const key = `${side}_${type}`;
              const r = rows[key];
              return (
                <div key={key} className="grid grid-cols-12 items-center gap-2 px-3 py-2">
                  <div className="col-span-2 text-sm font-medium">{tko}</div>
                  <div className="col-span-3">
                    <Input type="number" inputMode="decimal" step="any" value={r.amount} placeholder="결재금액"
                      onChange={(e) => set(key, "amount", e.target.value)} className="h-9" />
                  </div>
                  <div className="col-span-3">
                    <Input type="date" value={r.receivedAt} onChange={(e) => set(key, "receivedAt", e.target.value)} className="h-9" />
                  </div>
                  <div className="col-span-2">
                    <select className={selCls} value={r.method} onChange={(e) => set(key, "method", e.target.value)}>
                      <option value="">방법</option>
                      {METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <Input value={r.memo} placeholder="비고" onChange={(e) => set(key, "memo", e.target.value)} className="h-9" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        );
      })}
      <p className="text-xs text-muted-foreground">금액·결재일·방법·비고를 입력한 뒤 각 구분의 ‘저장’을 누르세요.</p>
    </div>
  );
}
