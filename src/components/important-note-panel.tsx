"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

// 제품제작 후가공내역 및 중요체크사항 입력 패널 (복구본 — 다양한 prop 이름 호환)
export function ImportantNotePanel(props: any) {
  const router = useRouter();
  const projectId: string = props.projectId ?? props.id;
  const initial: string = props.initial ?? props.value ?? props.importantNote ?? props.note ?? "";
  const [value, setValue] = useState<string>(initial ?? "");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setBusy(true); setSaved(false);
    const res = await fetch(`/api/projects/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ importantNote: value }),
    });
    setBusy(false);
    if (res.ok) { setSaved(true); router.refresh(); setTimeout(() => setSaved(false), 2000); }
    else alert("저장 실패");
  }

  return (
    <div className="space-y-2">
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="후가공 내역 및 중요 체크사항을 입력하세요 (예: 색상 기준, 인쇄 주의, 포장 사양 등)"
        rows={3}
      />
      <div className="flex items-center justify-end gap-2">
        {saved && <span className="text-xs text-emerald-600">✓ 저장됨</span>}
        <Button size="sm" onClick={save} disabled={busy}>{busy ? "저장 중..." : "저장"}</Button>
      </div>
    </div>
  );
}

export default ImportantNotePanel;
