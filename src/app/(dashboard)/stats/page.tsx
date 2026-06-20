import { prisma } from "@/lib/prisma";
import { getStatusConfig } from "@/lib/status-config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AggregateTable, type AggRow } from "@/components/aggregate-table";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const DAY = 86400000;

export default async function StatsPage() {
  const statusCfg = await getStatusConfig();

  const [projects, stepAll, stepDone, workLogs, payments, productCount] = await Promise.all([
    prisma.project.findMany({
      select: {
        id: true, status: true, orderDate: true, quantity: true,
        factoryOrderDate: true, productionCompleteDate: true,
        client: { select: { name: true } },
        factory: { select: { name: true } },
        manager: { select: { name: true } },
      },
    }),
    prisma.projectStep.groupBy({ by: ["type", "group", "name", "order"], _count: { _all: true } }),
    prisma.projectStep.groupBy({ by: ["type", "group", "name", "order"], where: { OR: [{ doneAt: { not: null } }, { staff: { not: null } }] }, _count: { _all: true } }),
    prisma.workLog.groupBy({ by: ["assigneeId"], _count: { _all: true } }),
    prisma.payment.findMany({ where: { amount: { not: null }, receivedAt: { not: null } }, select: { side: true, amount: true, receivedAt: true } }),
    prisma.product.count(),
  ]);

  const total = projects.length;
  const cntDone = projects.filter((p: any) => p.status === "완료").length;
  const cntProg = projects.filter((p: any) => p.status === "진행중").length;
  const totalQty = projects.reduce((a: number, p: any) => a + (p.quantity ?? 0), 0);
  const completionRate = total ? Math.round((cntDone / total) * 100) : 0;

  // 평균 리드타임 (공장주문 → 생산완료)
  const leads = projects
    .filter((p: any) => p.factoryOrderDate && p.productionCompleteDate)
    .map((p: any) => (new Date(p.productionCompleteDate).getTime() - new Date(p.factoryOrderDate).getTime()) / DAY)
    .filter((x: number) => x >= 0);
  const avgLead = leads.length ? Math.round(leads.reduce((a: number, b: number) => a + b, 0) / leads.length) : null;

  const kpis = [
    { label: "총 프로젝트", value: total },
    { label: "진행중", value: cntProg },
    { label: "완료", value: cntDone, sub: `완료율 ${completionRate}%` },
    { label: "총 품목", value: productCount.toLocaleString() },
    { label: "총 발주수량", value: totalQty.toLocaleString() },
    { label: "평균 리드타임", value: avgLead != null ? `${avgLead}일` : "-", sub: "공장주문→생산완료" },
  ];

  // 결재 입출금 (판매=입금, 구매=출금)
  const inflowTotal = (payments as any[]).filter((p) => p.side === "SALES").reduce((a, p) => a + Number(p.amount ?? 0), 0);
  const outflowTotal = (payments as any[]).filter((p) => p.side === "PURCHASE").reduce((a, p) => a + Number(p.amount ?? 0), 0);
  const netTotal = inflowTotal - outflowTotal;
  const finCards = [
    { label: "입금 합계 (판매)", value: inflowTotal, color: "text-blue-700" },
    { label: "출금 합계 (구매)", value: outflowTotal, color: "text-orange-700" },
    { label: "차액 (입금-출금)", value: netTotal, color: netTotal >= 0 ? "text-emerald-700" : "text-red-600" },
  ];

  // 월별 주문 추이 (최근 12개월)
  const now = new Date();
  const months: { key: string; label: string; count: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, label: `${d.getMonth() + 1}월`, count: 0 });
  }
  for (const p of projects as any[]) {
    if (!p.orderDate) continue;
    const d = new Date(p.orderDate);
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const m = months.find((x) => x.key === k);
    if (m) m.count++;
  }
  const monthMax = Math.max(1, ...months.map((m) => m.count));

  // 월별 입출금 추이 (최근 12개월)
  const cashMonths: { key: string; label: string; in: number; out: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    cashMonths.push({ key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, label: `${d.getMonth() + 1}월`, in: 0, out: 0 });
  }
  for (const pay of payments as any[]) {
    const d = new Date(pay.receivedAt);
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const m = cashMonths.find((x) => x.key === k);
    if (m) { if (pay.side === "SALES") m.in += Number(pay.amount ?? 0); else m.out += Number(pay.amount ?? 0); }
  }
  const cashMax = Math.max(1, ...cashMonths.flatMap((m) => [m.in, m.out]));

  // 상태별 분포
  const statusDist = statusCfg.order.map((s: string) => ({
    status: s, count: projects.filter((p: any) => p.status === s).length,
  }));
  const statusMax = Math.max(1, ...statusDist.map((s) => s.count));

  // 단계별 완료 현황
  const doneMap = new Map(stepDone.map((s: any) => [`${s.type}|${s.group}|${s.name}|${s.order}`, s._count._all]));
  const funnel = (stepAll as any[])
    .map((s) => ({ type: s.type, group: s.group, name: s.name, order: s.order, total: s._count._all, done: doneMap.get(`${s.type}|${s.group}|${s.name}|${s.order}`) ?? 0 }))
    .sort((a, b) => (a.type === b.type ? a.order - b.order : a.type === "PRODUCTION" ? -1 : 1));

  // 업체/공장/담당자 랭킹
  const rank = (getName: (p: any) => string) => {
    const m = new Map<string, number>();
    for (const p of projects as any[]) { const n = getName(p) || "미지정"; m.set(n, (m.get(n) ?? 0) + 1); }
    return [...m.entries()].map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count);
  };
  const topClients = rank((p) => p.client?.name).slice(0, 10);
  const topFactories = rank((p) => p.factory?.name).slice(0, 10);
  const byManager = rank((p) => p.manager?.name);

  // 집계표 데이터 (기준별)
  const aggregate = (keyFn: (p: any) => string, sortByCount = true): AggRow[] => {
    const m = new Map<string, AggRow>();
    for (const p of projects as any[]) {
      const key = keyFn(p) || "미지정";
      let r = m.get(key);
      if (!r) { r = { key, count: 0, quantity: 0, done: 0, inProgress: 0 }; m.set(key, r); }
      r.count++; r.quantity += p.quantity ?? 0;
      if (p.status === "완료") r.done++;
      if (p.status === "진행중") r.inProgress++;
    }
    const arr = [...m.values()];
    return sortByCount ? arr.sort((a, b) => b.count - a.count) : arr.sort((a, b) => a.key.localeCompare(b.key, "ko"));
  };
  const aggData: Record<string, AggRow[]> = {
    client: aggregate((p) => p.client?.name),
    factory: aggregate((p) => p.factory?.name),
    manager: aggregate((p) => p.manager?.name),
    status: statusCfg.order.map((s: string) => {
      const rows = (projects as any[]).filter((p) => p.status === s);
      return { key: statusCfg.label[s], count: rows.length, quantity: rows.reduce((a, p) => a + (p.quantity ?? 0), 0), done: s === "완료" ? rows.length : 0, inProgress: s === "진행중" ? rows.length : 0 };
    }).filter((r) => r.count > 0),
    month: aggregate((p) => p.orderDate ? `${new Date(p.orderDate).getFullYear()}-${String(new Date(p.orderDate).getMonth() + 1).padStart(2, "0")}` : "미상", false),
  };
  const dims = [
    { key: "client", label: "업체별" },
    { key: "factory", label: "공장별" },
    { key: "manager", label: "담당자별" },
    { key: "status", label: "상태별" },
    { key: "month", label: "주문월별" },
  ];

  const prodFunnel = funnel.filter((f) => f.type === "PRODUCTION");
  const shipFunnel = funnel.filter((f) => f.type === "SHIPPING");

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">통계</h1>
        <p className="text-sm text-muted-foreground">제작 프로젝트 전반 통계 및 집계</p>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">{k.label}</div>
              <div className="mt-1 text-2xl font-bold">{k.value}</div>
              {k.sub && <div className="mt-0.5 text-[11px] text-muted-foreground">{k.sub}</div>}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* 월별 주문 추이 */}
        <Card>
          <CardHeader><CardTitle className="text-base">월별 주문 추이 (최근 12개월)</CardTitle></CardHeader>
          <CardContent>
            <div className="flex h-40 items-end gap-1.5">
              {months.map((m) => (
                <div key={m.key} className="flex flex-1 flex-col items-center gap-1">
                  <div className="text-[10px] tabular-nums text-muted-foreground">{m.count || ""}</div>
                  <div className="w-full rounded-t bg-blue-500" style={{ height: `${(m.count / monthMax) * 100}%`, minHeight: m.count ? 2 : 0 }} />
                  <div className="text-[10px] text-muted-foreground">{m.label}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 상태별 분포 */}
        <Card>
          <CardHeader><CardTitle className="text-base">상태별 분포</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {statusDist.map((s) => (
              <div key={s.status} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className={cn("rounded-full border px-2 py-0.5 text-xs font-medium", statusCfg.style[s.status])}>{statusCfg.label[s.status]}</span>
                  <span className="tabular-nums text-muted-foreground">{s.count}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-foreground/70" style={{ width: `${(s.count / statusMax) * 100}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* 단계별 완료 현황 */}
      <Card>
        <CardHeader><CardTitle className="text-base">단계별 완료 현황 (전체 {total}건 중)</CardTitle></CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <FunnelCol title="제작일정 관리" rows={prodFunnel} total={total} accent="bg-blue-500" />
          <FunnelCol title="출고관리" rows={shipFunnel} total={total} accent="bg-emerald-500" />
        </CardContent>
      </Card>

      {/* 결재 입출금 */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">결재 입출금 요약</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {finCards.map((c) => (
              <div key={c.label} className="flex items-center justify-between rounded-md border p-3">
                <span className="text-sm">{c.label}</span>
                <span className={cn("text-lg font-bold tabular-nums", c.color)}>{c.value.toLocaleString()}</span>
              </div>
            ))}
            <p className="text-[11px] text-muted-foreground">※ 결재관리 기준. 금액은 입력된 결재금액 그대로 합산(통화 미구분).</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">월별 입출금 추이 (최근 12개월)</CardTitle></CardHeader>
          <CardContent>
            <div className="flex h-40 items-end gap-2">
              {cashMonths.map((m) => (
                <div key={m.key} className="flex flex-1 flex-col items-center gap-1">
                  <div className="flex h-full w-full items-end justify-center gap-0.5">
                    <div className="w-1/2 rounded-t bg-blue-500" style={{ height: `${(m.in / cashMax) * 100}%`, minHeight: m.in ? 2 : 0 }} title={`입금 ${m.in.toLocaleString()}`} />
                    <div className="w-1/2 rounded-t bg-orange-500" style={{ height: `${(m.out / cashMax) * 100}%`, minHeight: m.out ? 2 : 0 }} title={`출금 ${m.out.toLocaleString()}`} />
                  </div>
                  <div className="text-[10px] text-muted-foreground">{m.label}</div>
                </div>
              ))}
            </div>
            <div className="mt-2 flex justify-center gap-4 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-blue-500" /> 입금</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-orange-500" /> 출금</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 랭킹 */}
      <div className="grid gap-6 lg:grid-cols-2">
        <RankCard title="업체별 프로젝트 TOP 10" rows={topClients} accent="bg-indigo-500" />
        <RankCard title="공장별 프로젝트 TOP 10" rows={topFactories} accent="bg-amber-500" />
      </div>
      <RankCard title="담당자별 프로젝트 수" rows={byManager} accent="bg-rose-500" />

      {/* 집계표 */}
      <Card>
        <CardHeader><CardTitle className="text-base">집계표</CardTitle></CardHeader>
        <CardContent>
          <AggregateTable data={aggData} dims={dims} />
        </CardContent>
      </Card>
    </div>
  );
}

function FunnelCol({ title, rows, total, accent }: { title: string; rows: any[]; total: number; accent: string }) {
  return (
    <div className="space-y-2.5">
      <h3 className="text-sm font-semibold">{title}</h3>
      {rows.map((s) => {
        const base = total || 1;
        const pct = Math.round((s.done / base) * 100);
        return (
          <div key={`${s.name}-${s.order}`} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className={s.group !== s.name ? "text-muted-foreground" : ""}>{s.group !== s.name ? `${s.group} › ${s.name}` : s.name}</span>
              <span className="tabular-nums text-muted-foreground"><span className="font-semibold text-foreground">{s.done}</span> / {base}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div className={cn("h-full rounded-full", accent)} style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RankCard({ title, rows, accent }: { title: string; rows: { key: string; count: number }[]; accent: string }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {rows.length === 0 && <p className="text-sm text-muted-foreground">데이터가 없습니다.</p>}
        {rows.map((r) => (
          <div key={r.key} className="flex items-center gap-3 text-sm">
            <span className="w-28 shrink-0 truncate" title={r.key}>{r.key}</span>
            <div className="h-3 flex-1 overflow-hidden rounded-full bg-muted">
              <div className={cn("h-full rounded-full", accent)} style={{ width: `${(r.count / max) * 100}%` }} />
            </div>
            <span className="w-8 shrink-0 text-right tabular-nums text-muted-foreground">{r.count}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
