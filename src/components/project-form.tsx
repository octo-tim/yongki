"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toDateInput } from "@/lib/utils";
import { STATUS_LABEL, ALL_STATUSES } from "@/lib/status";

type Option = { id: string; name: string };
export type ProjectFormData = {
  id?: string;
  orderDate?: string | null; orderNo?: string | null; productName?: string;
  quantity?: number | null; deposit?: any; balance?: any; note?: string | null;
  clientId?: string | null; factoryId?: string | null; managerId?: string | null;
  manualHold?: boolean;
  manualStatus?: string | null;
  factoryOrderDate?: string | null; expectedCompletionDate?: string | null; productionCompleteDate?: string | null;
  warehouseInDate?: string | null; inspectionDate?: string | null; shipOutDate?: string | null;
  koreaArrivalDate?: string | null; customerDeliveryDate?: string | null;
  productPhoto?: string | null;
};

export function ProjectForm({
  initial, clients, factories, managers, mode,
}: {
  initial?: any; clients: Option[]; factories: Option[]; managers: Option[]; mode: "create" | "edit";
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [form, setForm] = useState<ProjectFormData>({
    orderDate: toDateInput(initial?.orderDate),
    orderNo: initial?.orderNo ?? "",
    productName: initial?.productName ?? "",
    quantity: initial?.quantity ?? undefined,
    deposit: initial?.deposit ? Number(initial.deposit) : undefined,
    balance: initial?.balance ? Number(initial.balance) : undefined,
    note: initial?.note ?? "",
    clientId: initial?.clientId ?? "",
    factoryId: initial?.factoryId ?? "",
    managerId: initial?.managerId ?? "",
    manualHold: initial?.manualHold ?? false,
    manualStatus: initial?.manualStatus ?? "",
    factoryOrderDate: toDateInput(initial?.factoryOrderDate),
    expectedCompletionDate: toDateInput(initial?.expectedCompletionDate),
    productionCompleteDate: toDateInput(initial?.productionCompleteDate),
    warehouseInDate: toDateInput(initial?.warehouseInDate),
    inspectionDate: toDateInput(initial?.inspectionDate),
    shipOutDate: toDateInput(initial?.shipOutDate),
    koreaArrivalDate: toDateInput(initial?.koreaArrivalDate),
    customerDeliveryDate: toDateInput(initial?.customerDeliveryDate),
    productPhoto: initial?.productPhoto ?? "",
  });

  function set<K extends keyof ProjectFormData>(k: K, v: ProjectFormData[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function uploadPhoto(file: File) {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    if (res.ok) {
      const data = await res.json();
      set("productPhoto", data.path);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.productName) { setErr("상품명은 필수입니다."); return; }
    setSaving(true); setErr("");
    const payload = {
      ...form,
      quantity: form.quantity ? Number(form.quantity) : null,
      deposit: form.deposit ? Number(form.deposit) : null,
      balance: form.balance ? Number(form.balance) : null,
      manualStatus: form.manualStatus || null,
    };
    const url = mode === "create" ? "/api/projects" : `/api/projects/${initial.id}`;
    const method = mode === "create" ? "POST" : "PATCH";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    setSaving(false);
    if (!res.ok) { setErr("저장에 실패했습니다."); return; }
    const data = await res.json();
    router.push(`/projects/${data.id ?? initial.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-base">기본 정보</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Field label="상품명 *"><Input value={form.productName ?? ""} onChange={(e) => set("productName", e.target.value)} required /></Field>
          <Field label="주문번호"><Input value={form.orderNo ?? ""} onChange={(e) => set("orderNo", e.target.value)} /></Field>
          <Field label="주문일자"><Input type="date" value={form.orderDate ?? ""} onChange={(e) => set("orderDate", e.target.value)} /></Field>
          <Field label="수량"><Input type="number" value={form.quantity ?? ""} onChange={(e) => set("quantity", e.target.value === "" ? null : Number(e.target.value))} /></Field>
          <Field label="계약금"><Input type="number" value={form.deposit ?? ""} onChange={(e) => set("deposit", e.target.value === "" ? null : Number(e.target.value))} /></Field>
          <Field label="잔금"><Input type="number" value={form.balance ?? ""} onChange={(e) => set("balance", e.target.value === "" ? null : Number(e.target.value))} /></Field>
          <Field label="업체명">
            <select className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.clientId ?? ""} onChange={(e) => set("clientId", e.target.value)}>
              <option value="">선택 안함</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="공장명">
            <select className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.factoryId ?? ""} onChange={(e) => set("factoryId", e.target.value)}>
              <option value="">선택 안함</option>
              {factories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="관리책임자">
            <select className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.managerId ?? ""} onChange={(e) => set("managerId", e.target.value)}>
              <option value="">선택 안함</option>
              {managers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="제품사진">
            <div className="space-y-2">
              <Input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && uploadPhoto(e.target.files[0])} />
              {form.productPhoto && <img src={form.productPhoto} alt="제품" className="h-20 rounded border object-cover" />}
            </div>
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">제작 일정</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <Field label="공장 주문일자"><Input type="date" value={form.factoryOrderDate ?? ""} onChange={(e) => set("factoryOrderDate", e.target.value)} /></Field>
          <Field label="완성 예정일"><Input type="date" value={form.expectedCompletionDate ?? ""} onChange={(e) => set("expectedCompletionDate", e.target.value)} /></Field>
          <Field label="생산 완료일"><Input type="date" value={form.productionCompleteDate ?? ""} onChange={(e) => set("productionCompleteDate", e.target.value)} /></Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">출고 일정</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <Field label="창고 입고일"><Input type="date" value={form.warehouseInDate ?? ""} onChange={(e) => set("warehouseInDate", e.target.value)} /></Field>
          <Field label="검품일"><Input type="date" value={form.inspectionDate ?? ""} onChange={(e) => set("inspectionDate", e.target.value)} /></Field>
          <Field label="출고일"><Input type="date" value={form.shipOutDate ?? ""} onChange={(e) => set("shipOutDate", e.target.value)} /></Field>
          <Field label="한국 도착일"><Input type="date" value={form.koreaArrivalDate ?? ""} onChange={(e) => set("koreaArrivalDate", e.target.value)} /></Field>
          <Field label="고객 인도일"><Input type="date" value={form.customerDeliveryDate ?? ""} onChange={(e) => set("customerDeliveryDate", e.target.value)} /></Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">기타</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Field label="상태 (수동 지정)">
            <select className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={form.manualStatus ?? ""} onChange={(e) => set("manualStatus", e.target.value)}>
              <option value="">자동 계산 (날짜 기준)</option>
              {ALL_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </select>
            <p className="pt-1 text-xs text-muted-foreground">
              상태를 직접 선택하면 해당 값으로 고정됩니다. &lsquo;자동 계산&rsquo;을 선택하면 날짜(생산완료·출고·인도 등)에 따라 자동으로 결정됩니다.
            </p>
          </Field>
          <Field label="특이사항"><Textarea value={form.note ?? ""} onChange={(e) => set("note", e.target.value)} rows={3} /></Field>
        </CardContent>
      </Card>

      {err && <p className="text-sm text-destructive">{err}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={saving}>{saving ? "저장 중..." : mode === "create" ? "등록" : "수정 저장"}</Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>취소</Button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
