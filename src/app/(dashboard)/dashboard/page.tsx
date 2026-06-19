import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { recomputeAll } from "@/lib/recompute";
import { getStatusConfig } from "@/lib/status-config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type StepAgg = { type: string; name: string; order: number; total: number; done: number };

export default async function DashboardPage() {
  await recomputeAll();
  const statusCfg = await getStatusConfig();

  const [grouped, total, stepAll, stepDone] = await Promise.all([
    prisma.project.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.project.count(),
    prisma.projectStep.groupBy({ by: ["type", "name", "order"], _count: { _all: true } }),
    prisma.projectStep.groupBy({ by: ["type", "name", "order"], where: { done: true }, _count: { _all: true } }),
  ]);

  const countMap = Object.fromEntries(grouped.map((g) => [g.status, g._count._all]));

  // 단계별 집계 (제작/출고, order 순)
  const doneMap = new Map(stepDone.map((s) => [`${s.type}|${s.name}|${s.order}`, s._count._all]));
  const steps: StepAgg[] = stepAll
    .map((s) => ({
      type: s.type, name: s.name, order: s.order,
      total: s._count._all,
      done: doneMap.get(`${s.type}|${s.name}|${s.order}`) ?? 0,
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

      {/* 단계별 현황 */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">단계별 현황 (각 단계 완료 프로젝트 수)</h2>
        <div className="grid gap-6 md:grid-cols-2">
          <StepCard title="제작 단계" steps={prod} accent="bg-blue-500" total={total} />
          <StepCard title="출고 단계" steps={ship} accent="bg-emerald-500" total={total} />
        </div>
      </section>
    </div>
  );
}

function StepCard({ title, steps, accent, total }: { title: string; steps: StepAgg[]; accent: string; total: number }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {steps.length === 0 && <p className="text-sm text-muted-foreground">단계 데이터가 없습니다.</p>}
        {steps.map((s) => {
          const base = s.total || total || 1;
          const pct = Math.round((s.done / base) * 100);
          return (
            <div key={`${s.type}-${s.name}-${s.order}`} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span>{s.name}</span>
                <span className="tabular-nums text-muted-foreground">
                  <span className="font-semibold text-foreground">{s.done}</span> / {s.total}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div className={cn("h-full rounded-full", accent)} style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
