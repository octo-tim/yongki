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
const won = (n: number) => n.toLocaleString() + "원";

export default async function SalesPage({ searchParams }: { searchParams: { period?: string; detail?: string } }) {
  const period = PERIODS.some((p) => p.key === searchParams.period) ? searchParams.period! : "today";
  const detail = searchParams.detail === "DEPOSIT" || searchParams.detail === "BALANCE" || searchParams.detail === "ALL" ? searchParams.detail : null;
  const { start, end, label } = rangeOf(period);

  const payments = await prisma.payment.findMany({
    where: { receivedAt: { gte: start, lt: end } },
    include: { project: { select: { id: true, productName: true, client: { select: { name: true } } } } },
    orderBy: { receivedAt: "desc" },
  });

  const dep = payments.filter((p: any) => p.type === "DEPOSIT");
  const bal = payments.filter((p: any) => p.type === "BALANCE");
  const sum = (arr: any[]) => arr.reduce((a, p) => a + Number(p.amount), 0);
  const depSum = sum(dep), balSum = sum(bal), allSum = depSum + balSum;

  const detailRows = detail === "DEPOSIT" ? dep : detail === "BALANCE" ? bal : detail === "ALL" ? payments : [];
  const detailTitle = detail === "DEPOSIT" ? "계약금" : detail === "BALANCE" ? "잔금" : "전체";

  const cells: { type: string; key: string; label: string; count: number; amount: number; color: string }[] = [
    { type: "DEPOSIT", key: "DEPOSIT", label: "계약금", count: dep.length, amount: depSum, color: "text-blue-700" },
    { type: "BALANCE", key: "BALANCE", label: "잔금", count: bal.length, amount: balSum, color: "text-emerald-700" },
    { type: "ALL", key: "ALL", label: "합계", count: payments.length, amount: allSum, color: "text-foreground" },
  ];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">매출현황</h1>
        <p className="text-sm text-muted-foreground">기간별 수금(계약금·잔금) 집계 · {fmt(start)} ~ {fmt(new Date(end.getTime() - DAY))}</p>
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

      {/* 집계 카드 */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {cells.map((c) => (
          <Card key={c.key}>
            <CardContent className="p-5">
              <div className="text-sm font-semibold">{c.label}</div>
              <div className="mt-2 flex items-end justify-between">
                <Link href={`/sales?period=${period}&detail=${c.key}`}
                  className={cn("text-sm hover:underline", detail === c.key ? "font-bold" : "text-muted-foreground")}>
                  건수 <span className={cn("text-xl font-bold", c.color)}>{c.count}</span> 건
                </Link>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">금액</div>
                  <div className="text-lg font-bold tabular-nums">{won(c.amount)}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="-mt-2 text-xs text-muted-foreground">※ 건수를 클릭하면 해당 기간·구분의 프로젝트 목록이 아래에 표시됩니다.</p>

      {/* 상세 목록 */}
      {detail && (
        <Card>
          <CardContent className="p-4">
            <div className="mb-3 text-sm font-semibold">{label} · {detailTitle} 수금 내역 ({detailRows.length}건)</div>
            {detailRows.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">해당 내역이 없습니다.</p>
            ) : (
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50 text-left">
                      <th className="px-3 py-2 font-semibold">프로젝트</th>
                      <th className="px-3 py-2 font-semibold">업체</th>
                      <th className="px-3 py-2 font-semibold">구분</th>
                      <th className="px-3 py-2 text-right font-semibold">금액</th>
                      <th className="px-3 py-2 font-semibold">수령일</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailRows.map((p: any, i: number) => (
                      <tr key={p.id} className={cn("border-b last:border-0", i % 2 ? "bg-muted/20" : "")}>
                        <td className="px-3 py-2">
                          <Link href={`/projects/${p.project?.id}`} className="font-medium text-primary hover:underline">{p.project?.productName ?? "-"}</Link>
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">{p.project?.client?.name ?? "-"}</td>
                        <td className="px-3 py-2">
                          <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${p.type === "DEPOSIT" ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700"}`}>
                            {p.type === "DEPOSIT" ? "계약금" : "잔금"}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums font-medium">{won(Number(p.amount))}</td>
                        <td className="px-3 py-2 text-muted-foreground">{fmtDate(p.receivedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
