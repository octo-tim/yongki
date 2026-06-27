"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { fmtDate } from "@/lib/utils";
import { FileIcon, Trash2, Upload } from "lucide-react";

type PFile = { id: string; fileName: string; filePath: string; fileSize: number | null; createdAt: string | Date };

export function FilePanel({ projectId, files }: { projectId: string; files: PFile[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function upload(file: File) {
    setBusy(true);
    const fd = new FormData();
    fd.append("file", file);
    await fetch(`/api/projects/${projectId}/files`, { method: "POST", body: fd });
    setBusy(false);
    router.refresh();
  }

  async function remove(id: string) {
    await fetch(`/api/projects/${projectId}/files?fileId=${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed p-4 text-sm text-muted-foreground hover:bg-accent">
        <Upload className="h-4 w-4" /> {busy ? "업로드 중..." : "파일 업로드 (클릭)"}
        <input type="file" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
      </label>
      <div className="space-y-2">
        {files.length === 0 && <p className="text-sm text-muted-foreground">첨부 파일이 없습니다.</p>}
        {files.map((f) => (
          <div key={f.id} className="group flex items-center justify-between rounded-md border p-2 text-sm">
            <a href={`/api/files/${f.id}`} target="_blank" rel="noreferrer" className="flex min-w-0 items-center gap-2 hover:underline">
              <FileIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="truncate">{f.fileName}</span>
              <span className="shrink-0 text-xs text-muted-foreground">{f.fileSize ? `${Math.round(f.fileSize / 1024)}KB` : ""}</span>
            </a>
            <button onClick={() => remove(f.id)} className="opacity-0 transition-opacity group-hover:opacity-100">
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
