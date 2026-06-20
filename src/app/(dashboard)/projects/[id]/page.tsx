import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { getStatusConfig } from "@/lib/status-config";
import { StepBoard } from "@/components/step-board";
import { NotePanel } from "@/components/note-panel";
import { WorkLogPanel } from "@/components/worklog-panel";
import { MeetingPanel } from "@/components/meeting-panel";
import { ImportantNotePanel } from "@/components/important-note-panel";
import { ProgressPhotoGrid } from "@/components/progress-photo-grid";
import { RequestPanel } from "@/components/request-panel";
import { PaymentPanel } from "@/components/payment-panel";
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
      workLogs: { orderBy: { createdAt: "desc" }, include: { assignee: { select: { id: true, name: true } }, creator: { select: { id: true, name: true } } } },
      meetings: { orderBy: { meetingDate: "desc" }, include: { client: { select: { id: true, name: true } }, factory: { select: { id: true, name: true } }, createdBy: { select: { name: true } }, files: true } },
      clientRequests: { orderBy: { requestDate: "desc" }, include: { createdBy: { select: { name: true } } } },
      progressPhotos: { orderBy: { createdAt: "desc" }, include: { client: { select: { id: true, name: true } }, factory: { select: { id: true, name: true } }, createdBy: { select: { name: true } } } },
      payments: { orderBy: { receivedAt: "desc" } },
      memos: { orderBy: { createdAt: "desc" }, include: { author: true } },
      logs: { orderBy: { createdAt: "desc" }, take: 10, include: { actor: true } },
    },
  });
  if (!p) notFound();
  const statusCfg = await getStatusConfig();
  const [users, clients, factories] = await Promise.all([
    prisma.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.client.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.factory.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  const boardSteps = p.steps.map((s) => ({
    id: s.id, type: s.type, group: s.group, name: s.name, order: s.order,
    done: s.done, doneAt: s.doneAt as any, staff: s.staff,
  }));

  const info: [string, string][] = [
    ["주문번호", p.orderNo ?? "-"],
    ["주문일자", fmtDate(p.orderDate)],
    ["수량", fmtMoney(p.quantity)],
    ["업체명", p.client?.name ?? "-"],
    ["공장명", p.factory?.name ?? "-"],
    ["관리책임자", p.manager?.name ?? "-"],
  ];
  const dep = Number(p.deposit ?? 0), bal = Number(p.balance ?? 0);
  const totalAmt = dep + bal;

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

          {/* 제품제작 중요사항 */}
          <Card>
            <CardHeader><CardTitle className="text-base">제품제작 중요사항</CardTitle></CardHeader>
            <CardContent>
              <ImportantNotePanel projectId={p.id} value={p.importantNote ?? null} />
            </CardContent>
          </Card>

          {/* 2. 진행 단계 */}
          <Card>
            <CardHeader><CardTitle className="text-base">진행 단계</CardTitle></CardHeader>
            <CardContent>
              <StepBoard projectId={p.id} steps={boardSteps} />
            </CardContent>
          </Card>

          {/* 진행사진 */}
          <Card>
            <CardHeader><CardTitle className="text-base">진행사진 ({p.progressPhotos.length})</CardTitle></CardHeader>
            <CardContent>
              <ProgressPhotoGrid photos={p.progressPhotos as any} empty="등록된 진행사진이 없습니다. (진행사진 메뉴에서 등록)" />
            </CardContent>
          </Card>

          {/* 3. 업무관리 */}
          <Card>
            <CardHeader><CardTitle className="text-base">업무관리</CardTitle></CardHeader>
            <CardContent>
              <WorkLogPanel users={users} fixedProjectId={p.id} logs={p.workLogs as any} />
            </CardContent>
          </Card>

          {/* 4. 회의록 */}
          <Card>
            <CardHeader><CardTitle className="text-base">회의록</CardTitle></CardHeader>
            <CardContent>
              <MeetingPanel clients={clients} factories={factories} fixedProjectId={p.id} meetings={p.meetings as any} showProject={false} />
            </CardContent>
          </Card>

          {/* 5. 거래처 요청사항 (날짜별) */}
          <Card>
            <CardHeader><CardTitle className="text-base">거래처 요청사항</CardTitle></CardHeader>
            <CardContent>
              <RequestPanel projectId={p.id} requests={p.clientRequests as any} />
            </CardContent>
          </Card>

          {/* 6. 특이사항 (작성자·작성일별 다중 입력) */}
          <Card>
            <CardHeader><CardTitle className="text-base">특이사항</CardTitle></CardHeader>
            <CardContent>
              <NotePanel projectId={p.id} notes={p.notes as any} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {/* 결제 정보 */}
          <Card>
            <CardHeader><CardTitle className="text-base">결제 정보</CardTitle></CardHeader>
            <CardContent>
              <dl className="space-y-2.5 text-sm">
                <div className="flex items-center justify-between border-b pb-2">
                  <dt className="text-muted-foreground">전체금액</dt>
                  <dd className="text-base font-bold">{fmtMoney(totalAmt)}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">계약금</dt>
                  <dd className="font-medium">{fmtMoney(p.deposit as any)}
                    {p.depositMethod && <span className="ml-2 rounded bg-accent px-1.5 py-0.5 text-xs text-foreground">{p.depositMethod}</span>}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">잔금</dt>
                  <dd className="font-medium">{fmtMoney(p.balance as any)}
                    {p.balanceMethod && <span className="ml-2 rounded bg-accent px-1.5 py-0.5 text-xs text-foreground">{p.balanceMethod}</span>}
                  </dd>
                </div>
                <div className="flex items-center justify-between border-t pt-2">
                  <dt className="text-muted-foreground">공장 결재계좌</dt>
                  <dd className="font-medium">{p.factoryAccount || "-"}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">수금 내역</CardTitle></CardHeader>
            <CardContent>
              <PaymentPanel projectId={p.id} payments={p.payments as any} />
            </CardContent>
          </Card>

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
