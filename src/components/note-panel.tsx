"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { fmtDate } from "@/lib/utils";
import { Trash2 } from "lucide-react";

type Note = { id: string; content: string; createdAt: string | Date; author?: { name: string } | null };

export function NotePanel({ projectId, notes }: { projectId: string; notes: Note[] }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  async function add() {
    if (!text.trim()) return;
    setBusy(true);
    await fetch(`/api/projects/${projectId}/notes`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: text }),
    });
    setText(""); setBusy(false); router.refresh();
  }

  async function remove(id: string) {
    if (!confirm("이 특이사항을 삭제하시겠습니까?")) return;
    await fetch(`/api/projects/${projectId}/notes?noteId=${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="특이사항 입력... (작성자·작성일은 자동 기록)" rows={2} />
        <Button onClick={add} disabled={busy} className="self-end">등록</Button>
      </div>
      <div className="space-y-2">
        {notes.length === 0 && <p className="text-sm text-muted-foreground">등록된 특이사항이 없습니다.</p>}
        {notes.map((n) => (
          <div key={n.id} className="group rounded-md border p-3 text-sm">
            <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
              <span><span className="font-medium text-foreground">{n.author?.name ?? "사용자"}</span> · {fmtDate(n.createdAt)}</span>
              <button onClick={() => remove(n.id)} className="opacity-0 transition-opacity group-hover:opacity-100">
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </button>
            </div>
            <p className="whitespace-pre-wrap">{n.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
