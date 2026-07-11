"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

// 제품제작 후가공내역 및 중요체크사항 입력 패널
// 내용에 맞춰 입력창 높이가 자동 확장되어, 내용이 길어도 한 번에 보인다.
export function ImportantNotePanel(props: any) {
  const router = useRouter();
  const projectId: string = props.projectId ?? props.id;
  const initial: string = props.initial ?? props.value ?? props.importantNote ?? props.note ?? "";
  const [value, setValue] = useState<string>(initial ?? "");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  const autosize = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.max(el.scrollHeight, 80) + "px";
  }, []);

  // 초기 로드 및 값 변경 시 높이 조정 (기존 내용도 펼쳐서 표시)
  useEffect(() => { autosize(); }, [value, autosize]);

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
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => { setValue(e.target.value); autosize(); }}
        onInput={autosize}
        placeholder="후가공 내역 및 중요 체크사항을 입력하세요 (예: 색상 기준, 인쇄 주의, 포장 사양 등)"
        className="w-full resize-none overflow-hidden rounded-md border border-input bg-background px-3 py-2 text-sm leading-relaxed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        style={{ minHeight: 80 }}
      />
      <div className="flex items-center justify-end gap-2">
        {saved && <span className="text-xs text-emerald-600">✓ 저장됨</span>}
        <Button size="sm" onClick={save} disabled={busy}>{busy ? "저장 중..." : "저장"}</Button>
      </div>
    </div>
  );
}

export default ImportantNotePanel;
