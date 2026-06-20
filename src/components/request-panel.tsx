"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { fmtDate } from "@/lib/utils";
import { Trash2 } from "lucide-react";

type Req = { id: string; content: string; requestDate: any; createdBy?: { name: string } | null };

export function RequestPanel({ projectId, requests }: { projectId: string; requests: Req[] }) {
  const router = useRouter();
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
  const [requestDate, setRequestDate] = useState(today);
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function add() {
    if (!content.trim()) { setErr("요청 내용을 입력하세요."); return; }
    setBusy(true); setErr("");
    const res = await fetch(`/api/projects/${projectId}/requests`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, requestDate }),
    });
    setBusy(false);
    if (!res.ok) { setErr("등록에 실패했습니다."); return; }
    setContent(""); router.refresh();
  }
  async function remove(id: string) {
    if (!confirm("이 요청사항을 삭제하시겠습니까?")) return;
    await fetch(`/api/projects/${projectId}/requests?requestId=${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input type="date" value={requestDate} onChange={(e) => setRequestDate(e.target.value)} className="h-auto w-36 self-stretch" />
        <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="거래처 요청사항 입력..." rows={2} />
        <Button onClick={add} disabled={busy} className="self-end">등록</Button>
      </div>
      {err && <p className="text-xs text-destructive">{err}</p>}
      <div className="space-y-2">
        {requests.length === 0 && <p className="text-sm text-muted-foreground">등록된 요청사항이 없습니다.</p>}
        {requests.map((r) => (
          <div key={r.id} className="group rounded-md border p-3 text-sm">
            <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{fmtDate(r.requestDate)}</span>
              <div className="flex items-center gap-2">
                {r.createdBy && <span>{r.createdBy.name}</span>}
                <button onClick={() => remove(r.id)} className="opacity-0 transition-opacity group-hover:opacity-100">
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </button>
              </div>
            </div>
            <p className="whitespace-pre-wrap">{r.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
