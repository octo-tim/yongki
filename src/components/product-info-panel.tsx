"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fmtUnit } from "@/lib/utils";

type Product = {
  id: string; name: string; quantity: number | null;
  supplyPrice: any; supplyCurrency: string | null;
  salesPrice: any; salesCurrency: string | null; exchangeRate: any; salesVatRate?: any;
};

const selCls = "h-9 rounded-md border border-input bg-background px-2 text-sm";
const SUPPLY_CCY = ["RMB", "USD"];
const SALES_CCY = ["USD", "RMB", "KRW"];
const n = (v: any) => (v == null || v === "" ? 0 : Number(v));

export function ProductInfoPanel({ projectId, projectName, factoryId, clientId, product }: {
  projectId: string; projectName: string; factoryId: string | null; clientId: string | null; product: Product | null;
}) {
  const router = useRouter();
  const [pid, setPid] = useState<string | null>(product?.id ?? null);
  const [name, setName] = useState(product?.name ?? projectName);
  const [quantity, setQuantity] = useState(product?.quantity != null ? String(product.quantity) : "");
  const [supplyPrice, setSupplyPrice] = useState(product?.supplyPrice != null ? String(Number(product.supplyPrice)) : "");
  const [supplyCurrency, setSupplyCurrency] = useState(product?.supplyCurrency ?? "RMB");
  const [salesPrice, setSalesPrice] = useState(product?.salesPrice != null ? String(Number(product.salesPrice)) : "");
  const [salesCurrency, setSalesCurrency] = useState(product?.salesCurrency ?? "RMB");
  const [exchangeRate, setExchangeRate] = useState(product?.exchangeRate != null ? String(Number(product.exchangeRate)) : "");
  const [salesVatRate, setSalesVatRate] = useState(product?.salesVatRate != null ? String(Number(product.salesVatRate)) : "10");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const vatRate = n(salesVatRate);
  const salesUnitRaw = salesCurrency === "RMB" ? n(salesPrice) : n(salesPrice) * n(exchangeRate);
  const hasRate = n(exchangeRate) > 0;
  const salesConverted = salesCurrency === "RMB" || hasRate; // RMB 환산 여부
  const salesUnitBase = salesConverted ? salesUnitRaw : n(salesPrice); // 부가세 제외 단가
  const salesUnitVat = salesUnitBase * (vatRate / 100); // 단가 부가세
  const salesUnitIncl = salesUnitBase + salesUnitVat; // 부가세 포함 단가
  const salesCcy = salesConverted ? "RMB" : salesCurrency;
  const salesTotalBase = n(quantity) * salesUnitBase; // 공급가액
  const salesTotalVat = salesTotalBase * (vatRate / 100); // 부가세
  const salesTotal = salesTotalBase + salesTotalVat; // 부가세 포함 전체금액
  const purchaseTotal = n(quantity) * n(supplyPrice);

  async function save() {
    setBusy(true); setSaved(false);
    const body = { name: name || projectName, quantity, supplyPrice, supplyCurrency, salesPrice, salesCurrency, exchangeRate, salesVatRate, projectId, factoryId, clientId };
    if (pid) {
      await fetch(`/api/products/${pid}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    } else {
      const res = await fetch("/api/products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (res.ok) { const d = await res.json(); setPid(d.id); }
    }
    setBusy(false); setSaved(true); router.refresh();
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <div className="space-y-3 text-sm">
      {/* 제품명 + 수량 */}
      <div className="flex items-end gap-2">
        <div className="flex-1 space-y-1">
          <span className="text-xs text-muted-foreground">제품명</span>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="w-28 space-y-1">
          <span className="text-xs text-muted-foreground">수량</span>
          <Input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="text-right" />
        </div>
      </div>

      {/* 구매단가 + 통화 */}
      <div className="flex items-end gap-2">
        <div className="flex-1 space-y-1">
          <span className="text-xs text-muted-foreground">구매단가 (공장)</span>
          <Input type="number" value={supplyPrice} step="any" onChange={(e) => setSupplyPrice(e.target.value)} className="text-right" />
        </div>
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground">통화</span>
          <select className={selCls} value={supplyCurrency} onChange={(e) => setSupplyCurrency(e.target.value)}>
            {SUPPLY_CCY.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* 판매단가 + 통화 + 환율 */}
      <div className="flex items-end gap-2">
        <div className="flex-1 space-y-1">
          <span className="text-xs text-muted-foreground">판매단가 (업체)</span>
          <Input type="number" value={salesPrice} step="any" onChange={(e) => setSalesPrice(e.target.value)} className="text-right" />
        </div>
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground">통화</span>
          <select className={selCls} value={salesCurrency} onChange={(e) => setSalesCurrency(e.target.value)}>
            {SALES_CCY.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="w-24 space-y-1">
          <span className="text-xs text-muted-foreground">환율(→RMB)</span>
          <Input type="number" value={exchangeRate} onChange={(e) => setExchangeRate(e.target.value)} disabled={salesCurrency === "RMB"} className="text-right" />
        </div>
      </div>

      {/* 부가세율 */}
      <div className="flex items-end gap-2">
        <div className="w-40 space-y-1">
          <span className="text-xs text-muted-foreground">부가세율 (%)</span>
          <Input type="number" value={salesVatRate} step="any" onChange={(e) => setSalesVatRate(e.target.value)} className="text-right" />
        </div>
        <p className="pb-2 text-[11px] text-muted-foreground">판매금액은 부가세를 포함하여 계산됩니다.</p>
      </div>

      {/* 변환/합계 요약 */}
      <div className="rounded-md border bg-muted/30 p-2.5 text-xs">
        <div className="flex justify-between"><span className="text-muted-foreground">판매단가{salesConverted && salesCurrency !== "RMB" ? "(RMB 환산)" : ""}</span><span className="font-medium">{fmtUnit(salesUnitBase)} {salesCcy}</span></div>
        <div className="mt-1 flex justify-between"><span className="text-muted-foreground">판매단가 (부가세 {fmtUnit(vatRate)}% 포함)</span><span className="font-medium">{fmtUnit(salesUnitIncl)} {salesCcy}</span></div>
        <div className="my-1.5 border-t" />
        <div className="flex justify-between"><span className="text-muted-foreground">공급가액 (수량×단가)</span><span className="font-medium">{fmtUnit(salesTotalBase)} {salesCcy}</span></div>
        <div className="mt-1 flex justify-between"><span className="text-muted-foreground">부가세 ({fmtUnit(vatRate)}%)</span><span className="font-medium">{fmtUnit(salesTotalVat)} {salesCcy}</span></div>
        <div className="mt-1 flex justify-between"><span className="text-muted-foreground">판매 전체금액 (부가세 포함)</span><span className="font-semibold text-blue-700">{fmtUnit(salesTotal)} {salesCcy}</span></div>
        <div className="my-1.5 border-t" />
        <div className="flex justify-between"><span className="text-muted-foreground">구매단가</span><span className="font-medium">{fmtUnit(n(supplyPrice))} {supplyCurrency}</span></div>
        <div className="mt-1 flex justify-between"><span className="text-muted-foreground">구매 전체금액</span><span className="font-semibold text-orange-700">{fmtUnit(purchaseTotal)} {supplyCurrency}</span></div>
        {!salesConverted && <p className="mt-1 text-[11px] text-muted-foreground">※ 환율 미입력 — 판매금액을 {salesCurrency}로 표시 (환율 입력 시 RMB 환산)</p>}
      </div>

      <div className="flex items-center justify-end gap-2">
        {saved && <span className="text-xs text-emerald-600">저장됨 ✓</span>}
        <Button size="sm" onClick={save} disabled={busy}>저장</Button>
      </div>
    </div>
  );
}
