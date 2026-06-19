"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { fmtDate } from "@/lib/utils";
import { Trash2 } from "lucide-react";

type Memo = { id: string; content: string; createdAt: string | Date; author?: { name: string } | null };

export function MemoPanel({ projectId, memos }: { projectId: string; memos: Memo[] }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  async function add() {
    if (!text.trim()) return;
    setBusy(true);
    await fetch(`/api/projects/${projectId}/memos`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: text }),
    });
    setText(""); setBusy(false); router.refresh();
  }

  async function remove(id: string) {
    await fetch(`/api/projects/${projectId}/memos?memoId=${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="메모 입력..." rows={2} />
        <Button onClick={add} disabled={busy} className="self-end">등록</Button>
      </div>
      <div className="space-y-2">
        {memos.length === 0 && <p className="text-sm text-muted-foreground">메모가 없습니다.</p>}
        {memos.map((m) => (
          <div key={m.id} className="group rounded-md border p-3 text-sm">
            <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
              <span>{m.author?.name ?? "사용자"} · {fmtDate(m.createdAt)}</span>
              <button onClick={() => remove(m.id)} className="opacity-0 transition-opacity group-hover:opacity-100">
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </button>
            </div>
            <p className="whitespace-pre-wrap">{m.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
