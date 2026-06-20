import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { cn, fmtDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

const DAY = 86400000;
const PERIODS = [
  { key: "today", label: "금일" },
  { key: "yesterday", label: "전일" },
  { key: "thisweek", label: "금주" },
  { key: "lastweek", label: "전주" },
  { key: "thismonth", label: "금월" },
  { key: "lastmonth", label: "전월" },
];

function rangeOf(period: string) {
  const todayStr = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
  const [Y, M, D] = todayStr.split("-").map(Number);
  const today = new Date(Date.UTC(Y, M - 1, D));
  const mondayOffset = (today.getUTCDay() + 6) % 7;
  const monday = new Date(today.getTime() - mondayOffset * DAY);
  switch (period) {
    case "yesterday": return { start: new Date(today.getTime() - DAY), end: today, label: "전일" };
    case "thisweek": return { start: monday, end: new Date(monday.getTime() + 7 * DAY), label: "금주" };
    case "lastweek": return { start: new Date(monday.getTime() - 7 * DAY), end: monday, label: "전주" };
    case "thismonth": return { start: new Date(Date.UTC(Y, M - 1, 1)), end: new Date(Date.UTC(Y, M, 1)), label: "금월" };
    case "lastmonth": return { start: new Date(Date.UTC(Y, M - 2, 1)), end: new Date(Date.UTC(Y, M - 1, 1)), label: "전월" };
    default: return { start: today, end: new Date(today.getTime() + DAY), label: "금일" };
  }
}
const fmt = (d: Date) => d.toISOString().slice(0, 10);
const money = (n: number) => n.toLocaleString();

function FlowTable({ title, rows, partyLabel, accent }: {
  title: string; rows: any[]; partyLabel: string; accent: string;
}) {
  const total = rows.reduce((a, p) => a + Number(p.amount ?? 0), 0);
  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-semibold">{title} <span className="text-muted-foreground">({rows.length}건)</span></div>
          <div className="text-right">
            <span className="text-xs text-muted-foreground">합계 </span>
            <span className={cn("text-lg font-bold tabular-nums", accent)}>{money(total)}</span>
          </div>
        </div>
        {rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">해당 기간 내역이 없습니다.</p>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-left">
                  <th className="px-3 py-2 font-semibold">결재일</th>
                  <th className="px-3 py-2 font-semibold">프로젝트</th>
                  <th className="px-3 py-2 font-semibold">{partyLabel}</th>
                  <th className="px-3 py-2 font-semibold">구분</th>
                  <th className="px-3 py-2 text-right font-semibold">금액</th>
                  <th className="px-3 py-2 font-semibold">방법</th>
                  <th className="px-3 py-2 font-semibold">비고</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p: any, i: number) => (
                  <tr key={p.id} className={cn("border-b last:border-0", i % 2 ? "bg-muted/20" : "")}>
                    <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{fmtDate(p.receivedAt)}</td>
                    <td className="px-3 py-2">
                      <Link href={`/projects/${p.project?.id}`} className="font-medium text-primary hover:underline">{p.project?.productName ?? "-"}</Link>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{p.party}</td>
                    <td className="px-3 py-2">
                      <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${p.type === "DEPOSIT" ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700"}`}>
                        {p.type === "DEPOSIT" ? "계약금" : "잔금"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right font-medium tabular-nums">{money(Number(p.amount ?? 0))}</td>
                    <td className="px-3 py-2 text-muted-foreground">{p.method ?? "-"}</td>
                    <td className="px-3 py-2 text-muted-foreground">{p.memo ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t bg-muted/40 font-semibold">
                  <td className="px-3 py-2" colSpan={4}>합계</td>
                  <td className="px-3 py-2 text-right tabular-nums">{money(total)}</td>
                  <td className="px-3 py-2" colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default async function CashflowPage({ searchParams }: { searchParams: { period?: string } }) {
  const period = PERIODS.some((p) => p.key === searchParams.period) ? searchParams.period! : "thismonth";
  const { start, end, label } = rangeOf(period);

  const payments = await prisma.payment.findMany({
    where: { receivedAt: { gte: start, lt: end }, amount: { not: null } },
    include: { project: { select: { id: true, productName: true, client: { select: { name: true } }, factory: { select: { name: true } } } } },
    orderBy: { receivedAt: "desc" },
  });

  const inflow = payments.filter((p: any) => p.side === "SALES").map((p: any) => ({ ...p, party: p.project?.client?.name ?? "-" }));
  const outflow = payments.filter((p: any) => p.side === "PURCHASE").map((p: any) => ({ ...p, party: p.project?.factory?.name ?? "-" }));
  const sum = (arr: any[]) => arr.reduce((a, p) => a + Number(p.amount ?? 0), 0);
  const inSum = sum(inflow), outSum = sum(outflow), net = inSum - outSum;

  const cards = [
    { label: "입금 합계 (판매)", count: inflow.length, amount: inSum, color: "text-blue-700" },
    { label: "출금 합계 (구매)", count: outflow.length, amount: outSum, color: "text-orange-700" },
    { label: "차액 (입금-출금)", count: payments.length, amount: net, color: net >= 0 ? "text-emerald-700" : "text-red-600" },
  ];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">입출금현황</h1>
        <p className="text-sm text-muted-foreground">기간별 입금(판매)·출금(구매) 내역 · {fmt(start)} ~ {fmt(new Date(end.getTime() - DAY))}</p>
      </div>

      {/* 기간 선택 */}
      <div className="flex flex-wrap gap-2">
        {PERIODS.map((p) => (
          <Link key={p.key} href={`/sales?period=${p.key}`}
            className={cn("rounded-md border px-4 py-2 text-sm font-medium transition-colors",
              period === p.key ? "border-foreground bg-foreground text-background" : "hover:bg-accent")}>
            {p.label}
          </Link>
        ))}
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardContent className="p-5">
              <div className="text-sm font-semibold">{c.label}</div>
              <div className="mt-2 flex items-end justify-between">
                <span className="text-sm text-muted-foreground">건수 <span className={cn("text-xl font-bold", c.color)}>{c.count}</span> 건</span>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">금액</div>
                  <div className={cn("text-lg font-bold tabular-nums", c.color)}>{money(c.amount)}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="-mt-2 text-xs text-muted-foreground">※ 결재관리의 판매(업체 수금)=입금, 구매(공장 지급)=출금 기준. 금액은 입력된 결재금액 그대로 합산합니다.</p>

      {/* 입금/출금 내역 */}
      <FlowTable title={`${label} 입금내역`} rows={inflow} partyLabel="업체(판매처)" accent="text-blue-700" />
      <FlowTable title={`${label} 출금내역`} rows={outflow} partyLabel="공장(구매처)" accent="text-orange-700" />
    </div>
  );
}
