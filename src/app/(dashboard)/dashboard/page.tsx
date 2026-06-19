import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { recomputeAll } from "@/lib/recompute";
import { ALL_STATUSES, STATUS_LABEL, STATUS_STYLE } from "@/lib/status";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { fmtDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  await recomputeAll();

  const [grouped, total, recent, delayed] = await Promise.all([
    prisma.project.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.project.count(),
    prisma.project.findMany({
      orderBy: { updatedAt: "desc" }, take: 8,
      include: { client: true, factory: true },
    }),
    prisma.project.findMany({
      where: { status: "DELAYED" }, orderBy: { expectedCompletionDate: "asc" }, take: 5,
      include: { client: true },
    }),
  ]);

  const countMap = Object.fromEntries(grouped.map((g) => [g.status, g._count._all]));

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">대시보드</h1>
        <p className="text-sm text-muted-foreground">전체 {total}건의 제작 프로젝트 현황</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {ALL_STATUSES.map((s) => (
          <Link key={s} href={`/projects?status=${s}`}>
            <Card className="transition-shadow hover:shadow-md">
              <CardContent className="p-4">
                <div className={cn("mb-2 inline-flex rounded-full border px-2 py-0.5 text-xs font-medium", STATUS_STYLE[s])}>
                  {STATUS_LABEL[s]}
                </div>
                <div className="text-2xl font-bold">{countMap[s] ?? 0}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">최근 업데이트</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {recent.length === 0 && <p className="text-sm text-muted-foreground">데이터가 없습니다.</p>}
            {recent.map((p) => (
              <Link key={p.id} href={`/projects/${p.id}`}
                className="flex items-center justify-between rounded-md border p-3 text-sm transition-colors hover:bg-accent">
                <div className="min-w-0">
                  <div className="truncate font-medium">{p.productName}</div>
                  <div className="text-xs text-muted-foreground">
                    {p.client?.name ?? "업체미정"} · {p.factory?.name ?? "공장미정"}
                  </div>
                </div>
                <StatusBadge status={p.status} />
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base text-red-600">지연 알림</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {delayed.length === 0 && <p className="text-sm text-muted-foreground">지연 건이 없습니다.</p>}
            {delayed.map((p) => (
              <Link key={p.id} href={`/projects/${p.id}`}
                className="block rounded-md border border-red-100 bg-red-50/50 p-3 text-sm transition-colors hover:bg-red-50">
                <div className="truncate font-medium">{p.productName}</div>
                <div className="text-xs text-muted-foreground">완성예정: {fmtDate(p.expectedCompletionDate)}</div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
