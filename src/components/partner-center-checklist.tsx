import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { ClipboardList, MessageSquare, Upload, Paperclip, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { PartnerConfirmButton } from "@/components/partner-confirm-button";

// 파트너센터 확인사항 — 고객 포털에서 새로 입력된 요청/문의/파일을 항목별로 통합해 표시.
// 각 항목의 "확인"을 누르면 처리 완료되어 목록에서 사라진다.
export async function PartnerCenterChecklist() {
  const [reqs, inqs] = await Promise.all([
    prisma.clientPortalRequest.findMany({
      where: { status: { not: "처리완료" } },
      orderBy: { createdAt: "desc" }, take: 30,
      select: {
        id: true, content: true, status: true, fileName: true, fileSize: true, createdAt: true,
        project: { select: { id: true, productName: true } }, client: { select: { name: true } },
      },
    }),
    prisma.clientInquiry.findMany({
      where: { status: "답변대기" },
      orderBy: { updatedAt: "desc" }, take: 30,
      select: {
        id: true, subject: true, createdAt: true, clientId: true,
        project: { select: { id: true, productName: true } }, client: { select: { name: true } },
        messages: { orderBy: { createdAt: "desc" }, take: 1, select: { content: true } },
      },
    }),
  ]);

  type Item = {
    id: string; kind: "request" | "inquiry" | "file"; confirmKind: "request" | "inquiry";
    title: string; sub: string; href: string; createdAt: Date;
  };
  const items: Item[] = [];
  for (const q of inqs) {
    items.push({
      id: q.id, kind: "inquiry", confirmKind: "inquiry",
      title: q.subject,
      sub: `${q.client?.name ?? ""}${q.project ? ` · ${q.project.productName}` : ""}${q.messages[0] ? ` — ${q.messages[0].content}` : ""}`,
      href: q.project ? `/projects/${q.project.id}` : `/clients/${q.clientId}`,
      createdAt: q.createdAt as any,
    });
  }
  for (const r of reqs) {
    const isFile = !!r.fileName;
    items.push({
      id: r.id, kind: isFile ? "file" : "request", confirmKind: "request",
      title: isFile ? (r.fileName as string) : (r.content || "요청"),
      sub: `${r.client?.name ?? ""}${r.project ? ` · ${r.project.productName}` : ""}${isFile && r.content ? ` — ${r.content}` : ""}`,
      href: r.project ? `/projects/${r.project.id}` : "/projects",
      createdAt: r.createdAt as any,
    });
  }
  items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const total = items.length;
  const dt = (v: Date) => new Date(v).toISOString().slice(5, 16).replace("T", " ");
  const badge = (k: Item["kind"]) =>
    k === "inquiry" ? { cls: "bg-amber-100 text-amber-700", icon: <MessageSquare className="h-3 w-3" />, label: "문의" } :
    k === "file" ? { cls: "bg-violet-100 text-violet-700", icon: <Paperclip className="h-3 w-3" />, label: "파일" } :
    { cls: "bg-blue-100 text-blue-700", icon: <Upload className="h-3 w-3" />, label: "요청" };

  return (
    <section className="space-y-2">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
        <ClipboardList className={cn("h-4 w-4", total > 0 && "text-rose-500")} />
        파트너센터 확인사항
        {total > 0 && <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-600">{total}</span>}
      </h2>
      <Card>
        <CardContent className="p-0">
          {total === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">확인 대기 중인 파트너센터 입력사항이 없습니다.</p>
          ) : (
            <div className="divide-y">
              {items.map((it) => {
                const b = badge(it.kind);
                return (
                  <div key={`${it.kind}-${it.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-accent/50">
                    <span className={cn("flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium", b.cls)}>{b.icon}{b.label}</span>
                    <Link href={it.href} className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{it.title}</p>
                      {it.sub.trim() && <p className="truncate text-xs text-muted-foreground">{it.sub}</p>}
                    </Link>
                    <span className="shrink-0 text-[11px] text-muted-foreground">{dt(it.createdAt)}</span>
                    <PartnerConfirmButton kind={it.confirmKind} id={it.id} />
                    <Link href={it.href} className="shrink-0 text-muted-foreground hover:text-foreground"><ChevronRight className="h-4 w-4" /></Link>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
