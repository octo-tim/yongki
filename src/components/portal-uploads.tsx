import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { FolderUp, Paperclip, Download, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const statusColor: Record<string, string> = { 접수: "bg-amber-100 text-amber-700", 확인중: "bg-blue-100 text-blue-700", 처리완료: "bg-emerald-100 text-emerald-700" };

function fmtSize(n: number | null) {
  if (!n) return "";
  if (n < 1024) return `${n}B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)}KB`;
  return `${(n / 1024 / 1024).toFixed(1)}MB`;
}

// 고객 포털에서 업로드된 파일 목록 — 최신순, 클릭 시 파일 열기 / 프로젝트로 이동
export async function PortalUploads() {
  const files = await prisma.clientPortalRequest.findMany({
    where: { fileName: { not: null } },
    orderBy: { createdAt: "desc" },
    take: 15,
    select: {
      id: true, fileName: true, fileSize: true, status: true, createdAt: true, content: true,
      client: { select: { name: true } },
      project: { select: { id: true, productName: true } },
    },
  });
  const dt = (v: Date) => new Date(v).toISOString().slice(5, 16).replace("T", " ");

  return (
    <section className="space-y-2">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
        <FolderUp className="h-4 w-4" />
        고객 업로드 파일 (포털)
        {files.length > 0 && <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-bold text-blue-600">{files.length}</span>}
      </h2>
      <Card>
        <CardContent className="p-0">
          {files.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">고객이 업로드한 파일이 없습니다.</p>
          ) : (
            <div className="divide-y">
              {files.map((f) => (
                <div key={f.id} className="flex items-center gap-3 px-4 py-2.5">
                  <a href={`/api/portal/requests/${f.id}/download`} target="_blank" rel="noreferrer"
                    className="flex min-w-0 flex-1 items-center gap-2 hover:underline">
                    <Paperclip className="h-4 w-4 shrink-0 text-blue-600" />
                    <span className="truncate text-sm font-medium">{f.fileName}</span>
                    <span className="shrink-0 text-[11px] text-muted-foreground">{fmtSize(f.fileSize)}</span>
                  </a>
                  <span className="hidden max-w-[16rem] truncate text-xs text-muted-foreground sm:block">
                    {f.client?.name}{f.project ? ` · ${f.project.productName}` : ""}
                  </span>
                  <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium", statusColor[f.status] ?? "bg-muted")}>{f.status}</span>
                  <span className="shrink-0 text-[11px] text-muted-foreground">{dt(f.createdAt as any)}</span>
                  <a href={`/api/portal/requests/${f.id}/download`} className="shrink-0 rounded p-1 text-muted-foreground hover:bg-accent" title="다운로드"><Download className="h-3.5 w-3.5" /></a>
                  {f.project && (
                    <Link href={`/projects/${f.project.id}`} className="shrink-0 rounded p-1 text-muted-foreground hover:bg-accent" title="프로젝트로 이동"><ChevronRight className="h-4 w-4" /></Link>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
