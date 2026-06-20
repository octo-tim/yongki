"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fmtMoney } from "@/lib/utils";

type Product = {
  id: string; name: string; quantity: number | null;
  supplyPrice: any; supplyCurrency: string | null;
  salesPrice: any; salesCurrency: string | null; exchangeRate: any;
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
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const salesRmb = salesCurrency === "RMB" ? n(salesPrice) : n(salesPrice) * n(exchangeRate);
  const salesTotal = n(quantity) * salesRmb;
  const purchaseTotal = n(quantity) * n(supplyPrice);

  async function save() {
    setBusy(true); setSaved(false);
    const body = { name: name || projectName, quantity, supplyPrice, supplyCurrency, salesPrice, salesCurrency, exchangeRate, projectId, factoryId, clientId };
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
          <Input type="number" value={supplyPrice} onChange={(e) => setSupplyPrice(e.target.value)} className="text-right" />
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
          <Input type="number" value={salesPrice} onChange={(e) => setSalesPrice(e.target.value)} className="text-right" />
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

      {/* 변환/합계 요약 */}
      <div className="rounded-md border bg-muted/30 p-2.5 text-xs">
        <div className="flex justify-between"><span className="text-muted-foreground">판매단가(RMB 환산)</span><span className="font-medium">{fmtMoney(salesRmb)} RMB</span></div>
        <div className="mt-1 flex justify-between"><span className="text-muted-foreground">판매 전체금액</span><span className="font-semibold text-blue-700">{fmtMoney(salesTotal)} RMB</span></div>
        <div className="mt-1 flex justify-between"><span className="text-muted-foreground">구매 전체금액</span><span className="font-semibold text-orange-700">{fmtMoney(purchaseTotal)} {supplyCurrency}</span></div>
      </div>

      <div className="flex items-center justify-end gap-2">
        {saved && <span className="text-xs text-emerald-600">저장됨 ✓</span>}
        <Button size="sm" onClick={save} disabled={busy}>저장</Button>
      </div>
    </div>
  );
}
