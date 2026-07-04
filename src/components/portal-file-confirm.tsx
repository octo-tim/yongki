"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FileText, Download, CheckCircle2 } from "lucide-react";

type SF = { id: string; title: string; memo: string | null; fileName: string; fileSize: number | null; confirmedAt: string | null; confirmedBy: string | null; createdAt: string };

function fmtSize(n: number | null) {
  if (!n) return "";
  if (n < 1024) return `${n}B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)}KB`;
  return `${(n / 1024 / 1024).toFixed(1)}MB`;
}

// 고객용: 확인요청 파일 열람 + 확인 버튼
export function PortalFileConfirm({ files }: { files: SF[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function confirm(id: string) {
    setBusy(id);
    const res = await fetch(`/api/staff-files/${id}/confirm`, { method: "POST" });
    setBusy(null);
    if (res.ok) router.refresh();
    else alert("확인 처리 실패");
  }

  if (files.length === 0) return <p className="py-4 text-center text-sm text-muted-foreground">확인 요청된 파일이 없습니다.</p>;

  return (
    <div className="divide-y rounded-md border">
      {files.map((f) => (
        <div key={f.id} className="flex items-center gap-3 px-3 py-2.5">
          <FileText className="h-4 w-4 shrink-0 text-blue-600" />
          <div className="min-w-0 flex-1">
            <a href={`/api/staff-files/${f.id}/download`} target="_blank" rel="noreferrer" className="text-sm font-medium hover:underline">{f.title}</a>
            <p className="truncate text-xs text-muted-foreground">{f.fileName}{fmtSize(f.fileSize) && ` · ${fmtSize(f.fileSize)}`}{f.memo ? ` · ${f.memo}` : ""}</p>
          </div>
          <a href={`/api/staff-files/${f.id}/download`} className="shrink-0 rounded p-1 text-muted-foreground hover:bg-accent" title="다운로드"><Download className="h-3.5 w-3.5" /></a>
          {f.confirmedAt ? (
            <span className="flex shrink-0 items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" />확인완료
            </span>
          ) : (
            <Button size="sm" onClick={() => confirm(f.id)} disabled={busy === f.id}>
              {busy === f.id ? "처리 중..." : "확인"}
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}
