"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toDateInput } from "@/lib/utils";
import { STEP_ORDER } from "@/lib/steps";

type Option = { id: string; name: string };
export type ProjectFormData = {
  id?: string;
  orderDate?: string | null; shipRequestDate?: string | null; initialStep?: string | null; orderNo?: string | null; productName?: string;
  quantity?: number | null; deposit?: any; balance?: any; note?: string | null;
  depositMethod?: string | null; balanceMethod?: string | null; factoryAccount?: string | null; importantNote?: string | null;
  clientId?: string | null; factoryId?: string | null; managerId?: string | null;
  status?: string;
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
    shipRequestDate: toDateInput(initial?.shipRequestDate),
    orderNo: initial?.orderNo ?? "",
    productName: initial?.productName ?? "",
    quantity: initial?.quantity ?? undefined,
    deposit: initial?.deposit ? Number(initial.deposit) : undefined,
    balance: initial?.balance ? Number(initial.balance) : undefined,
    depositMethod: initial?.depositMethod ?? "",
    balanceMethod: initial?.balanceMethod ?? "",
    factoryAccount: initial?.factoryAccount ?? "",
    importantNote: initial?.importantNote ?? "",
    note: initial?.note ?? "",
    clientId: initial?.clientId ?? "",
    factoryId: initial?.factoryId ?? "",
    managerId: initial?.managerId ?? "",
    status: initial?.status ?? "준비",
    productPhoto: initial?.productPhoto ?? "",
  });

  function set<K extends keyof ProjectFormData>(k: K, v: ProjectFormData[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function uploadPhoto(file: File) {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    if (res.ok) { const data = await res.json(); set("productPhoto", data.path); }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.productName) { setErr("상품명은 필수입니다."); return; }
    setSaving(true); setErr("");
    const { status: _omitStatus, ...rest } = form;
    const payload = {
      ...rest,
      quantity: form.quantity ? Number(form.quantity) : null,
      deposit: form.deposit ? Number(form.deposit) : null,
      balance: form.balance ? Number(form.balance) : null,
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
          <Field label="완료예정일"><Input type="date" value={form.shipRequestDate ?? ""} onChange={(e) => set("shipRequestDate", e.target.value)} /></Field>
          <Field label="수량"><Input type="number" value={form.quantity ?? ""} onChange={(e) => set("quantity", e.target.value === "" ? null : Number(e.target.value))} /></Field>
          <Field label="판매처 (업체)">
            <select className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.clientId ?? ""} onChange={(e) => set("clientId", e.target.value)}>
              <option value="">선택 안함</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="구매처 (공장)">
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
          {mode === "create" && (
          <Field label="시작 단계">
            <select className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={form.initialStep ?? ""} onChange={(e) => set("initialStep", e.target.value)}>
              <option value="">단계 선택 (미지정)</option>
              {STEP_ORDER.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          )}
          <Field label="제품사진">
            <div className="space-y-2">
              <Input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && uploadPhoto(e.target.files[0])} />
              {form.productPhoto && <img src={form.productPhoto} alt="제품" className="h-20 rounded border object-cover" />}
            </div>
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">특이사항</CardTitle></CardHeader>
        <CardContent>
          <Field label="제품제작 후가공내역 및 중요체크사항">
            <Textarea value={form.importantNote ?? ""} onChange={(e) => set("importantNote", e.target.value)} rows={3} placeholder="색상 기준, 인쇄 주의, 포장 사양 등" />
          </Field>
          <Field label="메모">
            <Textarea value={form.note ?? ""} onChange={(e) => set("note", e.target.value)} rows={3} />
          </Field>
          <p className="pt-2 text-xs text-muted-foreground">
            제작·출고 단계의 일자/직원은 저장 후 상세 화면의 &lsquo;진행 단계&rsquo;에서 입력합니다.
          </p>
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
