import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { getStatusConfig } from "@/lib/status-config";
import { StepBoard } from "@/components/step-board";
import { NotePanel } from "@/components/note-panel";
import { MemoPanel } from "@/components/memo-panel";
import { FilePanel } from "@/components/file-panel";
import { DeleteProjectButton } from "@/components/delete-project-button";
import { fmtDate, fmtMoney } from "@/lib/utils";
import { Pencil } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ProjectDetailPage({ params }: { params: { id: string } }) {
  const p = await prisma.project.findUnique({
    where: { id: params.id },
    include: {
      client: true, factory: true, manager: true,
      steps: { orderBy: [{ type: "asc" }, { order: "asc" }] },
      files: { orderBy: { createdAt: "desc" } },
      notes: { orderBy: { createdAt: "desc" }, include: { author: true } },
      memos: { orderBy: { createdAt: "desc" }, include: { author: true } },
      logs: { orderBy: { createdAt: "desc" }, take: 10, include: { actor: true } },
    },
  });
  if (!p) notFound();
  const statusCfg = await getStatusConfig();

  const boardSteps = p.steps.map((s) => ({
    id: s.id, type: s.type, group: s.group, name: s.name, order: s.order,
    done: s.done, doneAt: s.doneAt as any, staff: s.staff,
  }));

  const info: [string, string][] = [
    ["주문번호", p.orderNo ?? "-"],
    ["주문일자", fmtDate(p.orderDate)],
    ["수량", fmtMoney(p.quantity)],
    ["계약금", fmtMoney(p.deposit as any)],
    ["잔금", fmtMoney(p.balance as any)],
    ["업체명", p.client?.name ?? "-"],
    ["공장명", p.factory?.name ?? "-"],
    ["관리책임자", p.manager?.name ?? "-"],
  ];

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link href="/projects" className="text-sm text-muted-foreground hover:underline">프로젝트</Link>
            <span className="text-muted-foreground">/</span>
            <StatusBadge status={p.status} label={statusCfg.label[p.status]} colorClass={statusCfg.style[p.status]} />
          </div>
          <h1 className="text-2xl font-bold">{p.productName}</h1>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline"><Link href={`/projects/${p.id}/edit`}><Pencil className="h-4 w-4" /> 수정</Link></Button>
          <DeleteProjectButton projectId={p.id} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* 1. 기본 정보 (맨 위) */}
          <Card>
            <CardHeader><CardTitle className="text-base">기본 정보</CardTitle></CardHeader>
            <CardContent>
              {p.productPhoto && <img src={p.productPhoto} alt="제품" className="mb-4 h-32 rounded border object-cover" />}
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm md:grid-cols-4">
                {info.map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-xs text-muted-foreground">{k}</dt>
                    <dd className="font-medium">{v}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>

          {/* 2. 진행 단계 */}
          <Card>
            <CardHeader><CardTitle className="text-base">진행 단계</CardTitle></CardHeader>
            <CardContent>
              <StepBoard projectId={p.id} steps={boardSteps} />
            </CardContent>
          </Card>

          {/* 3. 특이사항 (작성자·작성일별 다중 입력) */}
          <Card>
            <CardHeader><CardTitle className="text-base">특이사항</CardTitle></CardHeader>
            <CardContent>
              <NotePanel projectId={p.id} notes={p.notes as any} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">메모</CardTitle></CardHeader>
            <CardContent>
              <MemoPanel projectId={p.id} memos={p.memos as any} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">첨부 파일</CardTitle></CardHeader>
            <CardContent>
              <FilePanel projectId={p.id} files={p.files as any} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">변경 이력</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {p.logs.length === 0 && <p className="text-sm text-muted-foreground">이력이 없습니다.</p>}
              {p.logs.map((l) => (
                <div key={l.id} className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{l.message}</span>
                  <span> · {fmtDate(l.createdAt)} {l.actor?.name ? `· ${l.actor.name}` : ""}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
