"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Paperclip, FileText, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

type Req = {
  id: string; content: string; status: string; fileName: string | null; fileSize: number | null; createdAt: string;
};
const STATUSES = ["접수", "확인중", "처리완료"];
const statusColor: Record<string, string> = { 접수: "bg-amber-100 text-amber-700", 확인중: "bg-blue-100 text-blue-700", 처리완료: "bg-emerald-100 text-emerald-700" };

function fmtSize(n: number | null) {
  if (!n) return null;
  if (n < 1024) return `${n}B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)}KB`;
  return `${(n / 1024 / 1024).toFixed(1)}MB`;
}

export function PortalRequestPanel({ projectId, requests, canCreate, canManage }: {
  projectId: string; requests: Req[]; canCreate: boolean; canManage?: boolean;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!content.trim()) return;
    setBusy(true);
    const fd = new FormData();
    fd.append("projectId", projectId);
    fd.append("content", content);
    const file = fileRef.current?.files?.[0];
    if (file) fd.append("file", file);
    const res = await fetch("/api/portal/requests", { method: "POST", body: fd });
    setBusy(false);
    if (res.ok) { setContent(""); if (fileRef.current) fileRef.current.value = ""; router.refresh(); }
    else alert("등록 실패");
  }
  async function setStatus(id: string, status: string) {
    const res = await fetch(`/api/portal/requests/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    if (res.ok) router.refresh();
  }

  return (
    <div className="space-y-3">
      {canCreate && (
        <div className="space-y-2 rounded-md border bg-muted/30 p-3">
          <Textarea placeholder="요청사항을 입력하세요 (디자인 수정, 색상 변경, 긴급 요청 등)" value={content} onChange={(e) => setContent(e.target.value)} rows={3} />
          <div className="flex items-center justify-between gap-2">
            <input ref={fileRef} type="file" className="flex-1 rounded-md border bg-background px-2 py-1.5 text-xs file:mr-2 file:rounded file:border-0 file:bg-accent file:px-2 file:py-1 file:text-xs" />
            <Button size="sm" onClick={submit} disabled={busy}><Upload className="mr-1 h-4 w-4" />{busy ? "등록 중..." : "요청 등록"}</Button>
          </div>
        </div>
      )}

      {requests.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">등록된 요청이 없습니다.</p>}

      <div className="divide-y rounded-md border">
        {requests.map((r) => (
          <div key={r.id} className="space-y-1.5 px-3 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">{new Date(r.createdAt).toISOString().slice(0, 16).replace("T", " ")}</span>
              {canManage ? (
                <select value={r.status} onChange={(e) => setStatus(r.id, e.target.value)} className={cn("rounded-full border-0 px-2 py-0.5 text-xs font-medium", statusColor[r.status])}>
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              ) : (
                <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", statusColor[r.status])}>{r.status}</span>
              )}
            </div>
            <p className="whitespace-pre-wrap text-sm">{r.content}</p>
            {r.fileName && (
              <a href={`/api/portal/requests/${r.id}/download`} target="_blank" rel="noreferrer" className="flex w-fit items-center gap-1 text-xs text-blue-600 hover:underline">
                <Paperclip className="h-3 w-3" />{r.fileName} {fmtSize(r.fileSize) && `(${fmtSize(r.fileSize)})`}
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
