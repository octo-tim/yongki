import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStatusConfig } from "@/lib/status-config";
import { statusOfStep, furthestStep } from "@/lib/steps";
import { Card, CardContent } from "@/components/ui/card";
import { WorkRequestPanel } from "@/components/work-request-panel";
import { MeetingPanel } from "@/components/meeting-panel";
import { DailyDateNav } from "@/components/daily-date-nav";
import { cn, fmtDate } from "@/lib/utils";
import { Building2, User, CalendarDays, ChevronRight, ClipboardCheck, PackageCheck } from "lucide-react";

export const dynamic = "force-dynamic";

const stepSelect = {
  id: true, productName: true, orderNo: true, shipRequestDate: true,
  client: { select: { name: true } }, manager: { select: { name: true } },
} as const;

export default async function DashboardPage({ searchParams }: { searchParams: { date?: string } }) {
  const session = await getServerSession(authOptions);
  const myId = (session?.user as any)?.id as string | undefined;
  const statusCfg = await getStatusConfig();

  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
  const dateStr = searchParams.date && /^\d{4}-\d{2}-\d{2}$/.test(searchParams.date) ? searchParams.date : today;
  const dayStart = new Date(`${dateStr}T00:00:00.000Z`);
  const dayEnd = new Date(dayStart.getTime() + 86400000);

  const [total, users, clients, factories, projectsForSelect, workRequests, recentMeetings, dailySteps, stageProjects] = await Promise.all([
    prisma.project.count(),
    prisma.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.client.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.factory.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.project.findMany({ orderBy: { orderDate: "desc" }, select: { id: true, productName: true } }),
    prisma.workRequest.findMany({
      where: { done: false },
      orderBy: { requestDate: "desc" }, take: 50,
      include: {
        requester: { select: { name: true } },
        assignee: { select: { id: true, name: true } },
        client: { select: { id: true, name: true } },
        factory: { select: { id: true, name: true } },
        project: { select: { id: true, productName: true } },
        updates: { orderBy: { progressDate: "asc" }, include: { createdBy: { select: { name: true } } } },
      },
    }),
    prisma.meeting.findMany({
      orderBy: { meetingDate: "desc" }, take: 4,
      include: { client: { select: { id: true, name: true } }, factory: { select: { id: true, name: true } }, project: { select: { id: true, productName: true } }, createdBy: { select: { name: true } }, files: true },
    }),
    prisma.projectStep.findMany({
      where: { doneAt: { gte: dayStart, lt: dayEnd } },
      include: { project: { select: { id: true, productName: true, status: true } } },
      orderBy: [{ projectId: "asc" }, { type: "asc" }, { order: "asc" }],
    }),
    prisma.project.findMany({ orderBy: { shipRequestDate: "asc" }, select: { ...stepSelect, steps: { select: { name: true, done: true } } } }),
  ]);

  // 현재 단계(가장 진행된 단계)를 단계 데이터에서 직접 계산 → status 컬럼에 의존하지 않음
  const curStep = (p: any) => furthestStep(p.steps) ?? "";
  const atInspection = (stageProjects as any[]).filter((p) => curStep(p) === "검품");
  const atProduction = (stageProjects as any[]).filter((p) => curStep(p) === "생산완료");

  const byProject: { project: any; steps: any[] }[] = [];
  for (const s of dailySteps) {
    let row = byProject.find((x) => x.project.id === s.projectId);
    if (!row) { row = { project: s.project, steps: [] }; byProject.push(row); }
    row.steps.push(s);
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">대시보드</h1>
        <p className="text-sm text-muted-foreground">전체 {total}건의 제작 프로젝트 현황</p>
      </div>

      {/* 업무 (업무요청) */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">업무</h2>
        <Card>
          <CardContent className="p-4">
            <WorkRequestPanel
              clients={clients} factories={factories}
              projects={projectsForSelect.map((p) => ({ id: p.id, name: p.productName }))}
              users={users} requests={workRequests as any} currentUserId={myId} />
          </CardContent>
        </Card>
      </section>

      {/* 단계별 프로젝트: 검품 / 생산완료 */}
      <section className="grid gap-4 lg:grid-cols-2">
        <StepProjectList title="검품 단계" icon={ClipboardCheck} accent="text-blue-600" rows={atInspection} />
        <StepProjectList title="생산완료(제작완료) 단계" icon={PackageCheck} accent="text-emerald-600" rows={atProduction} />
      </section>

      {/* 회의록 (최근 3개) */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">회의록 (최근 3개)</h2>
        <Card>
          <CardContent className="p-4">
            <MeetingPanel clients={clients} factories={factories} projects={projectsForSelect} meetings={recentMeetings as any} limit={3} />
          </CardContent>
        </Card>
      </section>

      {/* 일별 진행내역 */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-muted-foreground">일별 진행내역 (선택일에 진행된 단계 · 프로젝트별)</h2>
          <DailyDateNav value={dateStr} />
        </div>
        <Card>
          <CardContent className="space-y-3 p-4">
            {byProject.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">{dateStr}에 진행된 단계가 없습니다.</p>}
            {byProject.map(({ project, steps }) => (
              <div key={project.id} className="rounded-lg border p-3">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Link href={`/projects/${project.id}`} className="font-semibold hover:underline">{project.productName}</Link>
                  <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-medium", statusCfg.style[statusOfStep(project.status)] ?? "")}>
                    {project.status || "시작전"}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {steps.map((s) => (
                    <span key={s.id} className={cn("inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs",
                      s.type === "PRODUCTION" ? "border-blue-200 bg-blue-50" : "border-emerald-200 bg-emerald-50")}>
                      <span className="font-medium">{s.name}</span>
                      {s.staff && <span className="text-muted-foreground">· {s.staff}</span>}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function StepProjectList({ title, icon: Icon, accent, rows }: { title: string; icon: any; accent: string; rows: any[] }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-3 flex items-center gap-2">
          <Icon className={cn("h-4 w-4", accent)} />
          <h2 className="text-sm font-semibold">{title}</h2>
          <span className="text-xs text-muted-foreground">{rows.length}건</span>
        </div>
        {rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">해당 단계의 프로젝트가 없습니다.</p>
        ) : (
          <div className="space-y-1.5">
            {rows.map((p) => (
              <Link key={p.id} href={`/projects/${p.id}`}
                className="group flex items-center gap-3 rounded-lg border p-2.5 transition-colors hover:bg-accent">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium group-hover:text-primary">{p.productName}</div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                    {p.client?.name && <span className="inline-flex items-center gap-0.5"><Building2 className="h-3 w-3" />{p.client.name}</span>}
                    {p.shipRequestDate && <span className="inline-flex items-center gap-0.5"><CalendarDays className="h-3 w-3" />완료예정 {fmtDate(p.shipRequestDate)}</span>}
                    {p.manager?.name && <span className="inline-flex items-center gap-0.5"><User className="h-3 w-3" />{p.manager.name}</span>}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
