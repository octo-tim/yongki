import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getStatusConfig } from "@/lib/status-config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WorkLogPanel } from "@/components/worklog-panel";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type StepAgg = { type: string; group: string; name: string; order: number; total: number; done: number };

export default async function DashboardPage() {
  const statusCfg = await getStatusConfig();

  const [grouped, total, stepAll, stepDone, users, projectsForSelect, workLogs] = await Promise.all([
    prisma.project.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.project.count(),
    prisma.projectStep.groupBy({ by: ["type", "group", "name", "order"], _count: { _all: true } }),
    prisma.projectStep.groupBy({ by: ["type", "group", "name", "order"], where: { OR: [{ doneAt: { not: null } }, { staff: { not: null } }] }, _count: { _all: true } }),
    prisma.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.project.findMany({ orderBy: { orderDate: "desc" }, select: { id: true, productName: true } }),
    prisma.workLog.findMany({
      orderBy: { createdAt: "desc" }, take: 100,
      include: { assignee: { select: { id: true, name: true } }, project: { select: { id: true, productName: true } } },
    }),
  ]);

  const countMap = Object.fromEntries(grouped.map((g) => [g.status, g._count._all]));

  // 단계별 집계 — 전체 프로젝트 대비 각 단계 완료 건수 (type · order 순)
  const doneMap = new Map(stepDone.map((s) => [`${s.type}|${s.group}|${s.name}|${s.order}`, s._count._all]));
  const steps: StepAgg[] = stepAll
    .map((s) => ({
      type: s.type, group: s.group, name: s.name, order: s.order,
      total: s._count._all,
      done: doneMap.get(`${s.type}|${s.group}|${s.name}|${s.order}`) ?? 0,
    }))
    .sort((a, b) => (a.type === b.type ? a.order - b.order : a.type === "PRODUCTION" ? -1 : 1));

  const prod = steps.filter((s) => s.type === "PRODUCTION");
  const ship = steps.filter((s) => s.type === "SHIPPING");

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
            <WorkLogPanel
              users={users}
              projects={projectsForSelect}
              logs={workLogs as any}
              sortable
              showProject
            />
          </CardContent>
        </Card>
      </section>

      {/* 단계별 현황 */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">단계별 현황 (전체 {total}건 중 각 단계 완료 건수)</h2>
        <div className="grid gap-6 md:grid-cols-2">
          <StepCard title="제작일정 관리" steps={prod} accent="bg-blue-500" total={total} />
          <StepCard title="출고관리" steps={ship} accent="bg-emerald-500" total={total} />
        </div>
      </section>
    </div>
  );
}

function StepCard({ title, steps, accent, total }: { title: string; steps: StepAgg[]; accent: string; total: number }) {
  // 2단계 그룹 단위로 묶기 (순서 보존). 단일 단계 그룹(group===name)은 헤더 없이 표시.
  const groups: { group: string; rows: StepAgg[]; multi: boolean }[] = [];
  for (const s of steps) {
    let g = groups.find((x) => x.group === s.group);
    if (!g) { g = { group: s.group, rows: [], multi: false }; groups.push(g); }
    g.rows.push(s);
  }
  for (const g of groups) g.multi = g.rows.length > 1 || g.rows[0].name !== g.group;

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {steps.length === 0 && <p className="text-sm text-muted-foreground">단계 데이터가 없습니다.</p>}
        {groups.map((g) => (
          <div key={g.group} className={cn(g.multi && "rounded-md border bg-muted/20 p-2")}>
            {g.multi && (
              <div className="mb-2 px-0.5 text-xs font-semibold text-muted-foreground">{g.group}</div>
            )}
            <div className="space-y-2.5">
              {g.rows.map((s) => {
                const base = total || s.total || 1;
                const pct = Math.round((s.done / base) * 100);
                return (
                  <div key={`${s.name}-${s.order}`} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className={cn(g.multi && "text-muted-foreground")}>{s.name}</span>
                      <span className="tabular-nums text-muted-foreground">
                        <span className="font-semibold text-foreground">{s.done}</span> / {base}
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div className={cn("h-full rounded-full", accent)} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
