"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, FileText, Trash2, Download, CheckCircle2, Clock } from "lucide-react";

type SF = { id: string; title: string; memo: string | null; fileName: string; fileSize: number | null; uploaderName: string | null; confirmedAt: string | null; confirmedBy: string | null; createdAt: string };

function fmtSize(n: number | null) {
  if (!n) return "";
  if (n < 1024) return `${n}B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)}KB`;
  return `${(n / 1024 / 1024).toFixed(1)}MB`;
}

export function StaffFilePanel({ projectId, files }: { projectId: string; files: SF[] }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [memo, setMemo] = useState("");
  const [busy, setBusy] = useState(false);

  async function upload() {
    const file = fileRef.current?.files?.[0];
    if (!file) return alert("파일을 선택하세요");
    setBusy(true);
    const fd = new FormData();
    fd.append("projectId", projectId);
    fd.append("title", title || file.name);
    if (memo) fd.append("memo", memo);
    fd.append("file", file);
    const res = await fetch("/api/staff-files", { method: "POST", body: fd });
    setBusy(false);
    if (res.ok) { setTitle(""); setMemo(""); if (fileRef.current) fileRef.current.value = ""; router.refresh(); }
    else alert("업로드 실패");
  }
  async function remove(id: string) {
    if (!confirm("삭제하시겠습니까?")) return;
    const res = await fetch(`/api/staff-files/${id}`, { method: "DELETE" });
    if (res.ok) router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2 rounded-md border bg-muted/30 p-3">
        <Input placeholder="제목 (예: 최종 디자인 시안 - 확인 요청)" value={title} onChange={(e) => setTitle(e.target.value)} className="h-9" />
        <Input placeholder="메모 (선택)" value={memo} onChange={(e) => setMemo(e.target.value)} className="h-9" />
        <div className="flex items-center gap-2">
          <input ref={fileRef} type="file" className="h-9 flex-1 rounded-md border bg-background px-2 py-1.5 text-sm file:mr-2 file:rounded file:border-0 file:bg-accent file:px-2 file:py-1 file:text-xs" />
          <Button size="sm" onClick={upload} disabled={busy}><Upload className="mr-1 h-4 w-4" />{busy ? "업로드 중..." : "확인요청 업로드"}</Button>
        </div>
        <p className="text-[11px] text-muted-foreground">업로드하면 파트너센터(고객)에서 확인할 수 있고, 고객이 확인하면 아래에 확인 표시됩니다.</p>
      </div>

      {files.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">업로드한 확인요청 파일이 없습니다.</p>
      ) : (
        <div className="divide-y rounded-md border">
          {files.map((f) => (
            <div key={f.id} className="flex items-center gap-3 px-3 py-2.5">
              <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <a href={`/api/staff-files/${f.id}/download`} target="_blank" rel="noreferrer" className="text-sm font-medium hover:underline">{f.title}</a>
                <p className="truncate text-xs text-muted-foreground">{f.fileName}{fmtSize(f.fileSize) && ` · ${fmtSize(f.fileSize)}`}{f.uploaderName ? ` · ${f.uploaderName}` : ""}{f.memo ? ` · ${f.memo}` : ""}</p>
              </div>
              {f.confirmedAt ? (
                <span className="flex shrink-0 items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                  <CheckCircle2 className="h-3 w-3" />확인완료 {new Date(f.confirmedAt).toISOString().slice(5, 10)}
                </span>
              ) : (
                <span className="flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                  <Clock className="h-3 w-3" />확인대기
                </span>
              )}
              <a href={`/api/staff-files/${f.id}/download`} className="shrink-0 rounded p-1 text-muted-foreground hover:bg-accent"><Download className="h-3.5 w-3.5" /></a>
              <button onClick={() => remove(f.id)} className="shrink-0 rounded p-1 text-muted-foreground hover:bg-accent hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
