import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getStatusConfig } from "@/lib/status-config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WorkLogPanel } from "@/components/worklog-panel";
import { DailyDateNav } from "@/components/daily-date-nav";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage({ searchParams }: { searchParams: { date?: string } }) {
  const statusCfg = await getStatusConfig();

  // 선택일 (기본: 오늘, KST 기준)
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
  const dateStr = searchParams.date && /^\d{4}-\d{2}-\d{2}$/.test(searchParams.date) ? searchParams.date : today;
  const dayStart = new Date(`${dateStr}T00:00:00.000Z`);
  const dayEnd = new Date(dayStart.getTime() + 86400000);

  const [grouped, total, users, activeProjects, workLogs, dailySteps] = await Promise.all([
    prisma.project.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.project.count(),
    prisma.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    // 진행업무 등록용 프로젝트: 진행중만
    prisma.project.findMany({ where: { status: "IN_PROGRESS" }, orderBy: { orderDate: "desc" }, select: { id: true, productName: true } }),
    prisma.workLog.findMany({
      orderBy: { createdAt: "desc" }, take: 100,
      include: { assignee: { select: { id: true, name: true } }, project: { select: { id: true, productName: true } } },
    }),
    // 선택일에 일자가 잡힌 단계들 (일별 진행내역)
    prisma.projectStep.findMany({
      where: { doneAt: { gte: dayStart, lt: dayEnd } },
      include: { project: { select: { id: true, productName: true, status: true } } },
      orderBy: [{ projectId: "asc" }, { type: "asc" }, { order: "asc" }],
    }),
  ]);

  const countMap = Object.fromEntries(grouped.map((g) => [g.status, g._count._all]));

  // 일별 진행내역: 프로젝트별 묶기
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

      {/* 상태별 현황 */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">상태별 현황</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {statusCfg.order.map((s) => (
            <Link key={s} href={`/projects?status=${s}`}>
              <Card className="transition-shadow hover:shadow-md">
                <CardContent className="p-4">
                  <div className={cn("mb-2 inline-flex rounded-full border px-2 py-0.5 text-xs font-medium", statusCfg.style[s])}>
                    {statusCfg.label[s]}
                  </div>
                  <div className="text-2xl font-bold">{countMap[s] ?? 0}</div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* 진행업무 */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">진행업무 (담당자 · 프로젝트 · 진행내역)</h2>
        <Card>
          <CardContent className="p-4">
            <WorkLogPanel users={users} projects={activeProjects} logs={workLogs as any} sortable showProject />
          </CardContent>
        </Card>
      </section>

      {/* 일별 진행내역 */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-muted-foreground">일별 진행내역 (선택일에 진행된 일정 · 프로젝트별)</h2>
          <DailyDateNav value={dateStr} />
        </div>
        <Card>
          <CardContent className="space-y-3 p-4">
            {byProject.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">{dateStr}에 진행된 일정이 없습니다.</p>
            )}
            {byProject.map(({ project, steps }) => (
              <div key={project.id} className="rounded-lg border p-3">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Link href={`/projects/${project.id}`} className="font-semibold hover:underline">{project.productName}</Link>
                  <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-medium", statusCfg.style[project.status as keyof typeof statusCfg.style])}>
                    {statusCfg.label[project.status as keyof typeof statusCfg.label]}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {steps.map((s) => (
                    <span key={s.id} className={cn("inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs",
                      s.type === "PRODUCTION" ? "border-blue-200 bg-blue-50" : "border-emerald-200 bg-emerald-50")}>
                      <span className="font-medium">{s.group !== s.name ? `${s.group} › ${s.name}` : s.name}</span>
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
