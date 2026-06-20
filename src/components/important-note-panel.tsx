"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function ImportantNotePanel({ projectId, value }: { projectId: string; value: string | null }) {
  const router = useRouter();
  const [text, setText] = useState(value ?? "");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const dirty = (value ?? "") !== text;

  async function save() {
    setBusy(true);
    await fetch(`/api/projects/${projectId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ importantNote: text }),
    });
    setBusy(false); setSaved(true); router.refresh();
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <div className="space-y-2">
      <Textarea value={text} onChange={(e) => { setText(e.target.value); setSaved(false); }} rows={3}
        placeholder="제품 제작 시 중요사항을 입력하세요 (예: 색상 기준, 인쇄 주의, 포장 사양 등)" />
      <div className="flex items-center justify-end gap-2">
        {saved && <span className="text-xs text-emerald-600">저장됨</span>}
        <Button size="sm" onClick={save} disabled={busy || !dirty}>{busy ? "저장 중..." : "저장"}</Button>
      </div>
    </div>
  );
}
