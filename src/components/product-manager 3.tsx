"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SearchableSelect } from "@/components/searchable-select";
import { fmtPrice, cn } from "@/lib/utils";
import { Plus, Trash2 } from "lucide-react";

type Opt = { id: string; name: string };
type Product = {
  id: string; name: string; code: string | null; supplyPrice: any; salesPrice: any; quantity: number | null; note: string | null;
  projectId: string | null; factoryId: string | null; clientId: string | null;
  project?: { id: string; productName: string } | null; factory?: Opt | null; client?: Opt | null;
};

const GROUPS = [
  { key: "all", label: "전체" },
  { key: "project", label: "프로젝트별" },
  { key: "factory", label: "공장별" },
  { key: "client", label: "업체별" },
] as const;

const numOr0 = (v: any) => (v == null || v === "" ? 0 : Number(v));

export function ProductManager({ products, projects, factories, clients }: {
  products: Product[]; projects: Opt[]; factories: Opt[]; clients: Opt[];
}) {
  const router = useRouter();
  const [rows, setRows] = useState<Product[]>(products);
  const [group, setGroup] = useState<string>("all");
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const blank = { name: "", code: "", supplyPrice: "", salesPrice: "", quantity: "", note: "", projectId: "", factoryId: "", clientId: "" };
  const [form, setForm] = useState<Record<string, string>>(blank);
  const setF = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function add() {
    if (!form.name.trim()) return;
    setBusy(true);
    const res = await fetch("/api/products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setBusy(false);
    if (res.ok) { setForm(blank); setAdding(false); router.refresh(); }
  }

  function editLocal(id: string, field: string, value: any) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  }
  async function saveField(id: string, field: string, value: any) {
    await fetch(`/api/products/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ [field]: value }) });
    router.refresh();
  }
  async function remove(id: string) {
    if (!confirm("이 품목을 삭제하시겠습니까?")) return;
    setRows((rs) => rs.filter((r) => r.id !== id));
    await fetch(`/api/products/${id}`, { method: "DELETE" });
    router.refresh();
  }

  // 그룹핑
  const sections: { label: string; rows: Product[] }[] = (() => {
    if (group === "all") return [{ label: "", rows }];
    const keyOf = (r: Product) =>
      group === "project" ? (r.project?.productName ?? "(미지정)") :
      group === "factory" ? (r.factory?.name ?? "(미지정)") : (r.client?.name ?? "(미지정)");
    const map = new Map<string, Product[]>();
    for (const r of rows) { const k = keyOf(r); (map.get(k) ?? map.set(k, []).get(k)!).push(r); }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0], "ko")).map(([label, rs]) => ({ label, rows: rs }));
  })();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {GROUPS.map((g) => (
            <button key={g.key} onClick={() => setGroup(g.key)}
              className={cn("rounded-full border px-3 py-1 text-xs", group === g.key ? "bg-primary text-primary-foreground" : "bg-background")}>
              {g.label}
            </button>
          ))}
        </div>
        <Button size="sm" onClick={() => setAdding((v) => !v)}><Plus className="h-4 w-4" /> 품목추가</Button>
      </div>

      {adding && (
        <Card className="space-y-3 p-4">
          <div className="grid gap-3 md:grid-cols-3">
            <Field label="품목명 *"><Input value={form.name} onChange={(e) => setF("name", e.target.value)} /></Field>
            <Field label="품목코드"><Input value={form.code} onChange={(e) => setF("code", e.target.value)} /></Field>
            <Field label="수량"><Input type="number" value={form.quantity} onChange={(e) => setF("quantity", e.target.value)} /></Field>
            <Field label="공급단가 (공장)"><Input type="number" value={form.supplyPrice} onChange={(e) => setF("supplyPrice", e.target.value)} /></Field>
            <Field label="판매단가 (업체)"><Input type="number" value={form.salesPrice} onChange={(e) => setF("salesPrice", e.target.value)} /></Field>
            <Field label="비고"><Input value={form.note} onChange={(e) => setF("note", e.target.value)} /></Field>
            <Field label="프로젝트"><SearchableSelect options={projects} value={form.projectId} onChange={(v) => { const pr = projects.find((o) => o.id === v); setForm((f) => ({ ...f, projectId: v, name: pr ? pr.name : f.name })); }} /></Field>
            <Field label="구매처 (공장)"><SearchableSelect options={factories} value={form.factoryId} onChange={(v) => setF("factoryId", v)} /></Field>
            <Field label="판매처 (업체)"><SearchableSelect options={clients} value={form.clientId} onChange={(v) => setF("clientId", v)} /></Field>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => { setAdding(false); setForm(blank); }}>취소</Button>
            <Button size="sm" onClick={add} disabled={busy || !form.name.trim()}>추가</Button>
          </div>
        </Card>
      )}

      {rows.length === 0 && <Card><div className="py-12 text-center text-muted-foreground">등록된 품목이 없습니다.</div></Card>}

      {sections.map((sec) => (
        <div key={sec.label || "all"} className="space-y-2">
          {sec.label && (
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold">{sec.label}</h2>
              <span className="text-xs text-muted-foreground">{sec.rows.length}건</span>
            </div>
          )}
          {sec.rows.length > 0 && (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>품목명</TableHead>
                    <TableHead>프로젝트</TableHead>
                    <TableHead>공장</TableHead>
                    <TableHead>업체</TableHead>
                    <TableHead className="text-right">공급단가</TableHead>
                    <TableHead className="text-right">판매단가</TableHead>
                    <TableHead className="text-right">마진</TableHead>
                    <TableHead className="text-right">수량</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sec.rows.map((r) => {
                    const margin = numOr0(r.salesPrice) - numOr0(r.supplyPrice);
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="min-w-[10rem]">
                          <input value={r.name ?? ""} onChange={(e) => editLocal(r.id, "name", e.target.value)} onBlur={(e) => saveField(r.id, "name", e.target.value)}
                            className="w-full bg-transparent font-medium outline-none focus:rounded focus:bg-accent focus:px-1" />
                          {r.code && <span className="ml-1 text-xs text-muted-foreground">{r.code}</span>}
                        </TableCell>
                        <TableCell className="max-w-[12rem] truncate text-xs text-muted-foreground">{r.project?.productName ?? "-"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{r.factory?.name ?? "-"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{r.client?.name ?? "-"}</TableCell>
                        <TableCell className="text-right">
                          <input type="number" value={r.supplyPrice ?? ""} placeholder="-" step="0.01"
                            onChange={(e) => editLocal(r.id, "supplyPrice", e.target.value)} onBlur={(e) => saveField(r.id, "supplyPrice", e.target.value)}
                            className="w-24 rounded bg-transparent px-1 py-0.5 text-right outline-none focus:bg-accent" />
                        </TableCell>
                        <TableCell className="text-right">
                          <input type="number" value={r.salesPrice ?? ""} placeholder="-" step="0.01"
                            onChange={(e) => editLocal(r.id, "salesPrice", e.target.value)} onBlur={(e) => saveField(r.id, "salesPrice", e.target.value)}
                            className="w-24 rounded bg-transparent px-1 py-0.5 text-right outline-none focus:bg-accent" />
                        </TableCell>
                        <TableCell className={cn("text-right font-medium", margin > 0 ? "text-emerald-700" : margin < 0 ? "text-red-600" : "text-muted-foreground")}>
                          {fmtPrice(margin)}
                        </TableCell>
                        <TableCell className="text-right">
                          <input type="number" value={r.quantity ?? ""} placeholder="-"
                            onChange={(e) => editLocal(r.id, "quantity", e.target.value)} onBlur={(e) => saveField(r.id, "quantity", e.target.value)}
                            className="w-16 rounded bg-transparent px-1 py-0.5 text-right outline-none focus:bg-accent" />
                        </TableCell>
                        <TableCell>
                          <button onClick={() => remove(r.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          )}
        </div>
      ))}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
