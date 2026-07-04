import { CheckCircle2, Circle } from "lucide-react";

type Pay = { id: string; type: string; amount: any; receivedAt: string | Date | null; method: string | null };

const ORDER = ["DEPOSIT", "INTERIM", "BALANCE"] as const;
const KO: Record<string, string> = { DEPOSIT: "계약금", INTERIM: "중도금", BALANCE: "잔금" };

// 고객 포털용 결재 현황 — 판매(업체) 측만, 읽기 전용.
export function PortalPayments({ payments }: { payments: Pay[] }) {
  const byType = new Map(payments.map((p) => [p.type, p]));
  const rows = ORDER.map((t) => ({ type: t, p: byType.get(t) })).filter((r) => r.p && r.p.amount != null);
  const paid = rows.reduce((a, r) => a + Number(r.p!.amount || 0), 0);
  const d = (v: string | Date | null) => (v ? new Date(v).toISOString().slice(0, 10) : "-");

  if (rows.length === 0) return <p className="py-4 text-center text-sm text-muted-foreground">등록된 결재 내역이 없습니다.</p>;

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs">
            <tr>
              <th className="px-3 py-2 text-left">구분</th>
              <th className="px-3 py-2 text-right">결재금액</th>
              <th className="px-3 py-2 text-center">결재일</th>
              <th className="px-3 py-2 text-center">방법</th>
              <th className="px-3 py-2 text-center">상태</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map(({ type, p }) => {
              const done = !!p!.receivedAt;
              return (
                <tr key={type}>
                  <td className="px-3 py-2 font-medium">{KO[type]}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{Number(p!.amount).toLocaleString("ko-KR", { maximumFractionDigits: 4 })}</td>
                  <td className="px-3 py-2 text-center text-muted-foreground">{d(p!.receivedAt)}</td>
                  <td className="px-3 py-2 text-center text-muted-foreground">{p!.method ?? "-"}</td>
                  <td className="px-3 py-2">
                    <span className="flex items-center justify-center gap-1 text-xs">
                      {done ? <><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /><span className="text-emerald-700">결재완료</span></>
                        : <><Circle className="h-3.5 w-3.5 text-muted-foreground/40" /><span className="text-muted-foreground">예정</span></>}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="border-t bg-muted/20">
            <tr className="font-semibold">
              <td className="px-3 py-2">결재합</td>
              <td className="px-3 py-2 text-right tabular-nums">{paid.toLocaleString("ko-KR", { maximumFractionDigits: 4 })}</td>
              <td colSpan={3} />
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="text-[11px] text-muted-foreground">※ 결재 내역 관련 문의는 아래 문의하기를 이용해 주세요.</p>
    </div>
  );
}
