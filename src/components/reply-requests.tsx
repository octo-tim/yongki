import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { BellRing, Paperclip, MessageSquare, Upload, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

// 고객 포털에서 올라온 미처리 요청/문의 — 답변·처리 완료되면 자동으로 사라진다.
export async function ReplyRequests() {
  const [reqs, inqs] = await Promise.all([
    prisma.clientPortalRequest.findMany({
      where: { status: { not: "처리완료" } },
      orderBy: { createdAt: "desc" }, take: 20,
      select: {
        id: true, content: true, status: true, fileName: true, createdAt: true,
        project: { select: { id: true, productName: true } }, client: { select: { name: true } },
      },
    }),
    prisma.clientInquiry.findMany({
      where: { status: "답변대기" },
      orderBy: { updatedAt: "desc" }, take: 20,
      select: {
        id: true, subject: true, createdAt: true, clientId: true,
        project: { select: { id: true, productName: true } }, client: { select: { name: true } },
        messages: { orderBy: { createdAt: "desc" }, take: 1, select: { content: true } },
      },
    }),
  ]);
  const total = reqs.length + inqs.length;
  const dt = (v: Date) => new Date(v).toISOString().slice(5, 16).replace("T", " ");

  return (
    <section className="space-y-2">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
        <BellRing className={cn("h-4 w-4", total > 0 && "text-rose-500")} />
        회신요청 (고객 포털)
        {total > 0 && <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-600">{total}</span>}
      </h2>
      <Card>
        <CardContent className="p-0">
          {total === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">회신 대기 중인 고객 요청·문의가 없습니다.</p>
          ) : (
            <div className="divide-y">
              {inqs.map((q) => (
                <Link key={q.id} href={q.project ? `/projects/${q.project.id}` : `/clients/${q.clientId}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-accent/50">
                  <span className="flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700"><MessageSquare className="h-3 w-3" />문의</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{q.subject}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {q.client?.name}{q.project ? ` · ${q.project.productName}` : ""}{q.messages[0] ? ` — ${q.messages[0].content}` : ""}
                    </p>
                  </div>
                  <span className="shrink-0 text-[11px] text-muted-foreground">{dt(q.createdAt as any)}</span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </Link>
              ))}
              {reqs.map((r) => (
                <Link key={r.id} href={r.project ? `/projects/${r.project.id}` : "/projects"} className="flex items-center gap-3 px-4 py-2.5 hover:bg-accent/50">
                  <span className="flex shrink-0 items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-medium text-blue-700"><Upload className="h-3 w-3" />요청</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{r.content}</p>
                    <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                      {r.client?.name}{r.project ? ` · ${r.project.productName}` : ""}
                      {r.fileName && <span className="flex items-center gap-0.5"><Paperclip className="h-3 w-3" />{r.fileName}</span>}
                    </p>
                  </div>
                  <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium", r.status === "확인중" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700")}>{r.status}</span>
                  <span className="shrink-0 text-[11px] text-muted-foreground">{dt(r.createdAt as any)}</span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
