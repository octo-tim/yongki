import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStatusConfig } from "@/lib/status-config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardTasks } from "@/components/dashboard-tasks";
import { MeetingPanel } from "@/components/meeting-panel";
import { DailyDateNav } from "@/components/daily-date-nav";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage({ searchParams }: { searchParams: { date?: string } }) {
  const session = await getServerSession(authOptions);
  const myId = (session?.user as any)?.id as string | undefined;
  const statusCfg = await getStatusConfig();

  // 선택일 (기본: 오늘, KST 기준) — 일별 진행내역용
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
  const dateStr = searchParams.date && /^\d{4}-\d{2}-\d{2}$/.test(searchParams.date) ? searchParams.date : today;
  const dayStart = new Date(`${dateStr}T00:00:00.000Z`);
  const dayEnd = new Date(dayStart.getTime() + 86400000);

  const [attnRaw, total, users, activeProjects, allTasks, dailySteps, clients, recentMeetings, factories] = await Promise.all([
    // 주의 필요 후보: 완료가 아닌 프로젝트 + 최근 완료 단계 1건(정체 판단용)
    prisma.project.findMany({
      where: { status: { not: "DONE" } },
      select: {
        id: true, productName: true, status: true, orderDate: true,
        expectedCompletionDate: true, shipOutDate: true, koreaArrivalDate: true, customerDeliveryDate: true,
        client: { select: { name: true } },
        steps: { where: { doneAt: { not: null } }, select: { doneAt: true }, orderBy: { doneAt: "desc" }, take: 1 },
      },
    }),
    prisma.project.count(),
    prisma.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.project.findMany({ where: { status: "IN_PROGRESS" }, orderBy: { orderDate: "desc" }, select: { id: true, productName: true } }),
    // 업무현황: 전체 업무 (클라이언트에서 상태·담당자·날짜 필터)
    prisma.workLog.findMany({
      orderBy: { createdAt: "desc" }, take: 300,
      include: {
        assignee: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true } },
        project: { select: { id: true, productName: true } },
      },
    }),
    prisma.projectStep.findMany({
      where: { doneAt: { gte: dayStart, lt: dayEnd } },
      include: { project: { select: { id: true, productName: true, status: true } } },
      orderBy: [{ projectId: "asc" }, { type: "asc" }, { order: "asc" }],
    }),
    prisma.client.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.meeting.findMany({
      orderBy: { meetingDate: "desc" }, take: 4,
      include: { client: { select: { id: true, name: true } }, factory: { select: { id: true, name: true } }, project: { select: { id: true, productName: true } }, createdBy: { select: { name: true } }, files: true },
    }),
    prisma.factory.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  // 주의 필요 프로젝트 판정 (KST 오늘 기준)
  const todayMs = new Date(`${today}T00:00:00.000Z`).getTime();
  const dnum = (v: any) => (v ? Math.floor((todayMs - new Date(new Date(v).toISOString().slice(0, 10) + "T00:00:00.000Z").getTime()) / 86400000) : null); // 오늘 - 날짜 (일수, 과거면 양수)
  type Attn = { id: string; productName: string; client?: string | null; status: string; reason: string; sev: "red" | "amber"; sort: number };
  const attention: Attn[] = [];
  for (const p of attnRaw as any[]) {
    const ecdOver = dnum(p.expectedCompletionDate); // 양수=경과
    const shipped = !!p.shipOutDate;
    const delivered = !!p.customerDeliveryDate;
    const lastDoneDays = p.steps[0]?.doneAt ? dnum(p.steps[0].doneAt) : null;
    const shipDays = dnum(p.shipOutDate);
    let a: Attn | null = null;
    if (ecdOver != null && ecdOver > 0 && !shipped) {
      a = { ...base(p), reason: `완성예정일 ${ecdOver}일 경과`, sev: "red", sort: 1000 + ecdOver };
    } else if (shipped && !delivered && !p.koreaArrivalDate && shipDays != null && shipDays > 14) {
      a = { ...base(p), reason: `출고 후 ${shipDays}일 미인도`, sev: "red", sort: 900 + shipDays };
    } else if (ecdOver != null && ecdOver <= 0 && ecdOver >= -7) {
      a = { ...base(p), reason: `완성예정일 임박 (D${ecdOver === 0 ? "-day" : ecdOver})`, sev: "amber", sort: 500 + (7 + ecdOver) };
    } else if (p.status === "IN_PROGRESS") {
      const stall = lastDoneDays != null ? lastDoneDays : dnum(p.orderDate);
      if (stall != null && stall >= 14) a = { ...base(p), reason: `${stall}일째 진척 없음`, sev: "amber", sort: 200 + Math.min(stall, 99) };
    }
    if (a) attention.push(a);
  }
  attention.sort((x, y) => y.sort - x.sort);
  function base(p: any) { return { id: p.id, productName: p.productName, client: p.client?.name ?? null, status: p.status }; }

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

      {/* 업무현황 (상태·담당자·날짜 필터 + 업무추가) */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">업무현황</h2>
        <Card>
          <CardContent className="p-4">
            <DashboardTasks users={users} projects={activeProjects} tasks={allTasks as any} currentUserId={myId} />
          </CardContent>
        </Card>
      </section>

      {/* 주의 필요 프로젝트 */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">주의 필요 프로젝트 {attention.length > 0 && <span className="text-red-600">({attention.length})</span>}</h2>
        <Card>
          <CardContent className="p-4">
            {attention.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">👍 지금 주의가 필요한 프로젝트가 없습니다.</p>
            ) : (
              <div className="grid gap-2 md:grid-cols-2">
                {attention.slice(0, 12).map((a) => (
                  <Link key={a.id} href={`/projects/${a.id}`}
                    className={cn("flex items-center gap-3 rounded-lg border p-2.5 transition-colors hover:bg-accent",
                      a.sev === "red" ? "border-l-4 border-l-red-500" : "border-l-4 border-l-amber-500")}>
                    <span className={cn("mt-0.5 h-2 w-2 shrink-0 rounded-full", a.sev === "red" ? "bg-red-500" : "bg-amber-500")} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium">{a.productName}</span>
                        {a.client && <span className="shrink-0 text-xs text-muted-foreground">{a.client}</span>}
                      </div>
                      <span className={cn("text-xs font-medium", a.sev === "red" ? "text-red-600" : "text-amber-600")}>{a.reason}</span>
                    </div>
                    <span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium", statusCfg.style[a.status as keyof typeof statusCfg.style])}>
                      {statusCfg.label[a.status as keyof typeof statusCfg.label]}
                    </span>
                  </Link>
                ))}
                {attention.length > 12 && (
                  <Link href="/projects" className="flex items-center justify-center rounded-lg border p-2.5 text-xs text-muted-foreground hover:bg-accent md:col-span-2">
                    외 {attention.length - 12}건 더 보기 →
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* 회의록 (최근 3개) */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">회의록 (최근 3개)</h2>
        <Card>
          <CardContent className="p-4">
            <MeetingPanel clients={clients} factories={factories} projects={activeProjects} meetings={recentMeetings as any} limit={3} />
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
