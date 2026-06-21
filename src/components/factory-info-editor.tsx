"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Pencil } from "lucide-react";

type F = { key: string; label: string; textarea?: boolean; full?: boolean };
const FIELDS: F[] = [
  { key: "name", label: "공장명" },
  { key: "region", label: "지역" },
  { key: "mainProducts", label: "주요품목" },
  { key: "wechatGroup", label: "위쳇단체방이름(위챗ID)" },
  { key: "contactType", label: "소통수단" },
  { key: "contact", label: "공장담당자" },
  { key: "position", label: "직책" },
  { key: "phone", label: "연락처" },
  { key: "wechat", label: "위챗ID" },
  { key: "email", label: "이메일" },
  { key: "address", label: "주소", full: true },
  { key: "account", label: "계좌" },
  { key: "paymentTerms", label: "결제조건" },
  { key: "memo", label: "메모", textarea: true, full: true },
];

export function FactoryInfoEditor({ factory }: { factory: Record<string, any> }) {
  const router = useRouter();
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState<Record<string, string>>(() => {
    const o: Record<string, string> = {};
    for (const f of FIELDS) o[f.key] = factory[f.key] ?? "";
    return o;
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  async function save() {
    if (!form.name.trim()) { setErr("공장명은 필수입니다."); return; }
    setBusy(true); setErr("");
    const res = await fetch(`/api/factories/${factory.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
    });
    setBusy(false);
    if (res.ok) { setEdit(false); router.refresh(); } else { setErr("저장에 실패했습니다."); }
  }

  if (!edit) {
    return (
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">기본 정보</h2>
          <Button size="sm" variant="outline" onClick={() => setEdit(true)}><Pencil className="h-3.5 w-3.5" /> 수정</Button>
        </div>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm md:grid-cols-4">
          {FIELDS.filter((f) => f.key !== "name").map((f) => (
            <div key={f.key} className={f.full ? "col-span-2 md:col-span-4" : ""}>
              <dt className="text-xs text-muted-foreground">{f.label}</dt>
              <dd className="whitespace-pre-wrap font-medium">{factory[f.key] || "-"}</dd>
            </div>
          ))}
        </dl>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">기본 정보 수정</h2>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => { setEdit(false); setErr(""); }}>취소</Button>
          <Button size="sm" onClick={save} disabled={busy}>{busy ? "저장 중..." : "저장"}</Button>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
        {FIELDS.map((f) => (
          <div key={f.key} className={f.full ? "sm:col-span-2 md:col-span-3" : ""}>
            <label className="mb-1 block text-xs text-muted-foreground">{f.label}{f.key === "name" && " *"}</label>
            {f.textarea
              ? <Textarea value={form[f.key]} onChange={(e) => set(f.key, e.target.value)} rows={2} />
              : <Input value={form[f.key]} onChange={(e) => set(f.key, e.target.value)} />}
          </div>
        ))}
      </div>
      {err && <p className="mt-2 text-xs text-destructive">{err}</p>}
    </div>
  );
}
