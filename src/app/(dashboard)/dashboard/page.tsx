import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { recomputeAll } from "@/lib/recompute";
import { ALL_STATUSES, STATUS_LABEL, STATUS_STYLE } from "@/lib/status";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { DateNav } from "@/components/date-nav";
import { fmtDate, cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

// KST(UTC+9) 기준 YYYY-MM-DD
function kstDateStr(d: Date) {
  return new Date(d.getTime() + 9 * 3600 * 1000).toISOString().slice(0, 10);
}
const ACTION_LABEL: Record<string, string> = {
  CREATE: "등록", UPDATE: "수정", STATUS_CHANGE: "상태변경", STEP_UPDATE: "단계",
};

export default async function DashboardPage({ searchParams }: { searchParams: { date?: string } }) {
  await recomputeAll();

  const today = kstDateStr(new Date());
  const date = searchParams?.date && /^\d{4}-\d{2}-\d{2}$/.test(searchParams.date) ? searchParams.date : today;
  const start = new Date(`${date}T00:00:00+09:00`);
  const end = new Date(start.getTime() + 24 * 3600 * 1000);

  const [grouped, total, dayLogs, dayActionGroups, delayed] = await Promise.all([
    prisma.project.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.project.count(),
    prisma.projectLog.findMany({
      where: { createdAt: { gte: start, lt: end } },
      orderBy: { createdAt: "desc" }, take: 100,
      include: { project: { select: { id: true, productName: true } }, actor: { select: { name: true } } },
    }),
    prisma.projectLog.groupBy({
      by: ["action"], where: { createdAt: { gte: start, lt: end } }, _count: { _all: true },
    }),
    prisma.project.findMany({
      where: { status: "DELAYED" }, orderBy: { expectedCompletionDate: "asc" }, take: 5,
      include: { client: true },
    }),
  ]);

  const countMap = Object.fromEntries(grouped.map((g) => [g.status, g._count._all]));
  const dayTotal = dayActionGroups.reduce((s, g) => s + g._count._all, 0);
  const hhmm = (d: Date) => new Date(d.getTime() + 9 * 3600 * 1000).toISOString().slice(11, 16);

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
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-base">날짜별 업데이트 현황</CardTitle>
              <DateNav date={date} today={today} />
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">총 {dayTotal}건</span>
              {dayActionGroups.map((g) => (
                <span key={g.action} className="rounded-full bg-muted px-2 py-0.5">
                  {ACTION_LABEL[g.action] ?? g.action} {g._count._all}
                </span>
              ))}
            </div>
          </CardHeader>
          <CardContent className="max-h-[28rem] space-y-2 overflow-y-auto">
            {dayLogs.length === 0 && <p className="text-sm text-muted-foreground">해당 날짜의 업데이트가 없습니다.</p>}
            {dayLogs.map((l) => (
              <Link key={l.id} href={`/projects/${l.projectId}`}
                className="flex items-start justify-between gap-3 rounded-md border p-3 text-sm transition-colors hover:bg-accent">
                <div className="min-w-0">
                  <div className="truncate font-medium">{l.project?.productName ?? "(삭제됨)"}</div>
                  <div className="text-xs text-muted-foreground">{l.message}</div>
                </div>
                <div className="shrink-0 text-right text-xs text-muted-foreground">
                  <div>{hhmm(l.createdAt)}</div>
                  <div>{l.actor?.name ?? "-"}</div>
                </div>
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
