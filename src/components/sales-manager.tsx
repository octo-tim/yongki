"use client";
import { useState, useMemo } from "react";
import { ProposalManager } from "@/components/proposal-manager";
import { Send, Receipt, FlaskConical, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";

type Opt = { id: string; name: string };
type Tab = "PROPOSAL" | "INVOICE" | "SAMPLE";
type Period = "ALL" | "TODAY" | "YESTERDAY" | "THIS_WEEK" | "LAST_WEEK" | "THIS_MONTH" | "LAST_MONTH";

// KST 기준 하루 시작 (00:00) Date 반환
function kstStartOfDay(d: Date): Date {
  const kst = new Date(d.getTime() + 9 * 3600 * 1000);
  kst.setUTCHours(0, 0, 0, 0);
  return new Date(kst.getTime() - 9 * 3600 * 1000);
}
function addDays(d: Date, n: number): Date { return new Date(d.getTime() + n * 86400000); }

// 기간별 [시작, 끝) 범위 (KST 기준)
function periodRange(period: Period): [Date, Date] | null {
  if (period === "ALL") return null;
  const now = new Date();
  const todayStart = kstStartOfDay(now);
  switch (period) {
    case "TODAY": return [todayStart, addDays(todayStart, 1)];
    case "YESTERDAY": return [addDays(todayStart, -1), todayStart];
    case "THIS_WEEK": {
      // KST 요일 (월요일 시작)
      const kstNow = new Date(now.getTime() + 9 * 3600 * 1000);
      const dow = (kstNow.getUTCDay() + 6) % 7; // 월=0
      const weekStart = addDays(todayStart, -dow);
      return [weekStart, addDays(weekStart, 7)];
    }
    case "LAST_WEEK": {
      const kstNow = new Date(now.getTime() + 9 * 3600 * 1000);
      const dow = (kstNow.getUTCDay() + 6) % 7;
      const weekStart = addDays(todayStart, -dow);
      return [addDays(weekStart, -7), weekStart];
    }
    case "THIS_MONTH": {
      const kstNow = new Date(now.getTime() + 9 * 3600 * 1000);
      const y = kstNow.getUTCFullYear(), m = kstNow.getUTCMonth();
      const start = new Date(Date.UTC(y, m, 1) - 9 * 3600 * 1000);
      const end = new Date(Date.UTC(y, m + 1, 1) - 9 * 3600 * 1000);
      return [start, end];
    }
    case "LAST_MONTH": {
      const kstNow = new Date(now.getTime() + 9 * 3600 * 1000);
      const y = kstNow.getUTCFullYear(), m = kstNow.getUTCMonth();
      const start = new Date(Date.UTC(y, m - 1, 1) - 9 * 3600 * 1000);
      const end = new Date(Date.UTC(y, m, 1) - 9 * 3600 * 1000);
      return [start, end];
    }
  }
  return null;
}

const PERIODS: { key: Period; label: string }[] = [
  { key: "ALL", label: "전체" },
  { key: "TODAY", label: "금일" },
  { key: "YESTERDAY", label: "전일" },
  { key: "THIS_WEEK", label: "금주" },
  { key: "LAST_WEEK", label: "전주" },
  { key: "THIS_MONTH", label: "금월" },
  { key: "LAST_MONTH", label: "전월" },
];

export function SalesManager({ proposals, clients }: { proposals: any[]; clients: Opt[] }) {
  const [tab, setTab] = useState<Tab>("PROPOSAL");
  const [period, setPeriod] = useState<Period>("ALL");

  // 발행일 기준(sentDate 우선, 없으면 createdAt)으로 기간 필터
  const periodFiltered = useMemo(() => {
    const range = periodRange(period);
    if (!range) return proposals;
    const [start, end] = range;
    return proposals.filter((p) => {
      const d = p.sentDate ? new Date(p.sentDate) : (p.createdAt ? new Date(p.createdAt) : null);
      if (!d) return false;
      return d >= start && d < end;
    });
  }, [proposals, period]);

  const isProposal = (p: any) => (p.docType ?? "PROPOSAL") === "PROPOSAL";
  const isSample = (p: any) => p.docType === "INVOICE" && p.invoiceKind === "SAMPLE";
  const isInvoice = (p: any) => p.docType === "INVOICE" && p.invoiceKind !== "SAMPLE";

  const proposalList = periodFiltered.filter(isProposal);
  const invoiceList = periodFiltered.filter(isInvoice);
  const sampleList = periodFiltered.filter(isSample);

  const current = tab === "PROPOSAL" ? proposalList : tab === "SAMPLE" ? sampleList : invoiceList;
  const managerDocType = tab === "PROPOSAL" ? "PROPOSAL" : "INVOICE";

  const tabCls = (active: boolean) =>
    cn("flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm font-medium",
      active ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-accent");
  const periodCls = (active: boolean) =>
    cn("rounded-md border px-3 py-1.5 text-xs font-medium",
      active ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-accent");

  return (
    <div className="space-y-4">
      {/* 기간 필터 */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 flex items-center gap-1 text-xs font-medium text-muted-foreground"><CalendarDays className="h-3.5 w-3.5" />기간</span>
        {PERIODS.map((p) => (
          <button key={p.key} onClick={() => setPeriod(p.key)} className={periodCls(period === p.key)}>{p.label}</button>
        ))}
        <span className="ml-1 text-xs text-muted-foreground">발행일 기준 · {periodFiltered.length}건</span>
      </div>

      {/* 문서 종류 탭 */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setTab("PROPOSAL")} className={tabCls(tab === "PROPOSAL")}>
          <Send className="h-4 w-4" />제안서발송 <span className="text-xs opacity-80">{proposalList.length}</span>
        </button>
        <button onClick={() => setTab("INVOICE")} className={tabCls(tab === "INVOICE")}>
          <Receipt className="h-4 w-4" />인보이스발송 <span className="text-xs opacity-80">{invoiceList.length}</span>
        </button>
        <button onClick={() => setTab("SAMPLE")} className={tabCls(tab === "SAMPLE")}>
          <FlaskConical className="h-4 w-4" />샘플인보이스발송 <span className="text-xs opacity-80">{sampleList.length}</span>
        </button>
      </div>

      <ProposalManager key={`${tab}-${period}`} proposals={current} clients={clients} docType={managerDocType as any} />
    </div>
  );
}
