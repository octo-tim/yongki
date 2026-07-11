"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fmtUnit } from "@/lib/utils";
import { FileText, Plus, X } from "lucide-react";

type Pay = { id: string; side: string; type: string; amount: any; receivedAt: any; method: string | null; memo: string | null };
type Row = { amount: string; receivedAt: string; method: string; memo: string };

const METHODS = ["통장이체", "위쳇결재", "쯔프바오", "기타"];
const selCls = "h-9 w-full rounded-md border border-input bg-background px-2 text-sm";
const dInput = (v: any) => (v ? new Date(v).toISOString().slice(0, 10) : "");

function rowFrom(p?: Pay): Row {
  return { amount: p?.amount != null ? String(Number(p.amount)) : "", receivedAt: dInput(p?.receivedAt), method: p?.method ?? "", memo: p?.memo ?? "" };
}

type InvRow = { name: string; spec: string; qty: string; unitPrice: string; remark: string };
const emptyInv = (): InvRow => ({ name: "", spec: "", qty: "", unitPrice: "", remark: "" });

export function PaymentManager({ projectId, productName, payments, totals }: {
  projectId: string; productName?: string; payments: Pay[];
  totals?: { salesTotal: number; salesCurrency: string; purchaseTotal: number; purchaseCurrency: string };
}) {
  const router = useRouter();
  const find = (side: string, type: string) => payments.find((p) => p.side === side && p.type === type);
  const init: Record<string, Row> = {};
  for (const side of ["SALES", "PURCHASE"]) for (const type of ["DEPOSIT", "INTERIM", "BALANCE"]) init[`${side}_${type}`] = rowFrom(find(side, type));
  // 판매금액(부가세 포함)이 정해졌고 판매 계약금·잔금이 비어있으면 30%/70% 자동 채움 (수동 입력값은 보호)
  const salesTotalInit = Number(totals?.salesTotal || 0);
  if (salesTotalInit > 0) {
    if (!init["SALES_DEPOSIT"].amount) init["SALES_DEPOSIT"].amount = String(Math.round(salesTotalInit * 0.3));
    if (!init["SALES_BALANCE"].amount) init["SALES_BALANCE"].amount = String(Math.round(salesTotalInit * 0.7));
  }
  const [rows, setRows] = useState<Record<string, Row>>(init);
  const [busy, setBusy] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");
  // 인보이스 발행 다이얼로그 상태
  const [invKind, setInvKind] = useState<null | "DEPOSIT" | "INTERIM" | "BALANCE">(null);
  const [invAmount, setInvAmount] = useState("");
  const [invVat, setInvVat] = useState(true);
  const [invNote, setInvNote] = useState("");
  const [invRows, setInvRows] = useState<InvRow[]>([emptyInv()]);
  const [invBusy, setInvBusy] = useState(false);

  const kindKo = (k: string) => (k === "DEPOSIT" ? "계약금" : k === "INTERIM" ? "중도금" : k === "BALANCE" ? "잔금" : "");

  function openInvoice(type: "DEPOSIT" | "INTERIM" | "BALANCE") {
    setInvKind(type);
    setInvAmount(rows[`SALES_${type}`]?.amount || "");
    setInvVat(true); setInvNote(""); setInvRows([emptyInv()]);
  }

  async function issueInvoice() {
    if (!invKind) return;
    const items = invRows.filter((r) => r.name.trim()).map((r) => ({
      name: r.name.trim(), spec: r.spec.trim(), qty: Number(r.qty) || 0, unitPrice: Number(r.unitPrice) || 0, remark: r.remark.trim(),
    }));
    const amt = Number(invAmount) || 0;
    if (!amt && items.length === 0) return alert("금액 또는 항목을 입력하세요");
    setInvBusy(true);
    const res = await fetch(`/api/projects/${projectId}/issue-invoice`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: invKind, amount: amt, items, vatApplied: invVat, note: invNote }),
    });
    setInvBusy(false);
    if (res.ok) { const j = await res.json(); setInvKind(null); router.refresh(); router.push(`/quote/${j.id}`); }
    else { const j = await res.json().catch(() => ({})); alert(j.error || "발행 실패"); }
  }
  const setInvRow = (i: number, f: keyof InvRow, v: string) => setInvRows((rs) => rs.map((r, idx) => idx === i ? { ...r, [f]: v } : r));

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
                  <div className="col-span-2">
                    <Input type="date" value={r.receivedAt} onChange={(e) => set(key, "receivedAt", e.target.value)} className="h-9" />
                  </div>
                  <div className="col-span-2">
                    <select className={selCls} value={r.method} onChange={(e) => set(key, "method", e.target.value)}>
                      <option value="">방법</option>
                      {METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div className={side === "SALES" ? "col-span-2" : "col-span-3"}>
                    <Input value={r.memo} placeholder="비고" onChange={(e) => set(key, "memo", e.target.value)} className="h-9" />
                  </div>
                  {side === "SALES" && (
                    <div className="col-span-1 flex justify-center">
                      <button type="button" onClick={() => openInvoice(type)} title={`${kindKo(type)} 인보이스 발행`}
                        className="flex h-9 w-9 items-center justify-center rounded-md border text-rose-600 hover:bg-rose-50">
                        <FileText className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        );
      })}
      <p className="text-xs text-muted-foreground">금액·결재일·방법·비고를 입력한 뒤 각 구분의 ‘저장’을 누르세요. 판매 행의 문서 아이콘으로 해당 금액의 인보이스를 발행할 수 있습니다.</p>

      {/* 인보이스 발행 다이얼로그 */}
      {invKind && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setInvKind(null)}>
          <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-background p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold">{productName ? `${productName}_` : ""}{kindKo(invKind)} 인보이스 발행</h3>
              <button onClick={() => setInvKind(null)} className="rounded p-1 hover:bg-accent"><X className="h-4 w-4" /></button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <label className="w-20 shrink-0 text-sm text-muted-foreground">청구금액</label>
                <Input type="number" value={invAmount} onChange={(e) => setInvAmount(e.target.value)} placeholder="금액 (항목 입력 시 자동 합계)" className="h-9" />
                <label className="flex shrink-0 items-center gap-1 text-xs"><input type="checkbox" checked={invVat} onChange={(e) => setInvVat(e.target.checked)} />부가세 10%</label>
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-sm font-medium">항목 (선택 — 입력 시 항목 합계로 발행)</span>
                  <button onClick={() => setInvRows((rs) => [...rs, emptyInv()])} className="flex items-center gap-1 text-xs text-primary hover:underline"><Plus className="h-3.5 w-3.5" />항목 추가</button>
                </div>
                <div className="space-y-1.5">
                  {invRows.map((r, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <Input value={r.name} onChange={(e) => setInvRow(i, "name", e.target.value)} placeholder="제품명" className="h-8 flex-1" />
                      <Input value={r.spec} onChange={(e) => setInvRow(i, "spec", e.target.value)} placeholder="규격" className="h-8 w-24" />
                      <Input type="number" value={r.qty} onChange={(e) => setInvRow(i, "qty", e.target.value)} placeholder="수량" className="h-8 w-20" />
                      <Input type="number" value={r.unitPrice} onChange={(e) => setInvRow(i, "unitPrice", e.target.value)} placeholder="단가" className="h-8 w-24" />
                      <Input value={r.remark} onChange={(e) => setInvRow(i, "remark", e.target.value)} placeholder="비고" className="h-8 w-20" />
                      {invRows.length > 1 && <button onClick={() => setInvRows((rs) => rs.filter((_, idx) => idx !== i))} className="text-muted-foreground hover:text-destructive"><X className="h-3.5 w-3.5" /></button>}
                    </div>
                  ))}
                </div>
              </div>

              <Input value={invNote} onChange={(e) => setInvNote(e.target.value)} placeholder="비고 (선택)" className="h-9" />

              <div className="flex justify-end gap-2 pt-1">
                <Button size="sm" variant="outline" onClick={() => setInvKind(null)}>취소</Button>
                <Button size="sm" onClick={issueInvoice} disabled={invBusy}>{invBusy ? "발행 중..." : "발행 후 보기"}</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
