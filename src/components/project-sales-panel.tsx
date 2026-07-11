"use client";
import Link from "next/link";
import { Send, Receipt, Printer, FileSpreadsheet, FlaskConical } from "lucide-react";
import { cn } from "@/lib/utils";

type Doc = {
  id: string; title: string; docType: string | null; invoiceKind: string | null;
  amount: any; currency: string | null; status: string; sentDate: string | null; sentTo: string | null;
};
const won = (n: number) => n.toLocaleString("ko-KR");
const statusColor: Record<string, string> = { 발송완료: "bg-blue-100 text-blue-700", 검토중: "bg-amber-100 text-amber-700", 수주: "bg-emerald-100 text-emerald-700", 무산: "bg-zinc-200 text-zinc-600" };

// 프로젝트 상세의 영업(제안서·인보이스) — 발행 내역 조회 전용.
// 제안서 발행은 영업관리 화면에서, 인보이스 발행은 결재관리 행의 발행 아이콘에서 수행한다.
export function ProjectSalesPanel({ docs }: { projectId?: string; productName?: string; docs: Doc[] }) {
  const proposals = docs.filter((d) => (d.docType ?? "PROPOSAL") === "PROPOSAL");
  const invoices = docs.filter((d) => d.docType === "INVOICE");
  const kindKo = (k: string | null) => (k === "DEPOSIT" ? "계약금" : k === "INTERIM" ? "중도금" : k === "BALANCE" ? "잔금" : k === "FULL" ? "전체" : k === "SAMPLE" ? "샘플" : "");
  const kindColor = (k: string | null) =>
    k === "DEPOSIT" ? "bg-yellow-100 text-yellow-800" : k === "INTERIM" ? "bg-sky-100 text-sky-700" :
    k === "BALANCE" ? "bg-orange-100 text-orange-700" : k === "SAMPLE" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700";

  return (
    <div className="space-y-4">
      {/* 보낸 제안서 */}
      <div>
        <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><Send className="h-4 w-4 text-violet-600" />보낸 제안서 ({proposals.length})</h3>
        {proposals.length === 0 ? <p className="text-xs text-muted-foreground">발송한 제안서가 없습니다.</p> : (
          <div className="divide-y rounded-md border">
            {proposals.map((d) => (
              <div key={d.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                <Link href={`/quote/${d.id}`} className="flex-1 truncate font-medium hover:underline">{d.title}</Link>
                {d.amount != null && <span className="text-xs text-muted-foreground">{won(Number(d.amount))} {d.currency ?? "KRW"}</span>}
                <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", statusColor[d.status] ?? "bg-muted")}>{d.status}</span>
                <Link href={`/quote/${d.id}`} className="rounded p-1 text-muted-foreground hover:bg-accent" title="보기/인쇄"><Printer className="h-3.5 w-3.5" /></Link>
                <a href={`/api/proposals/${d.id}/excel`} className="rounded p-1 text-emerald-600 hover:bg-accent" title="엑셀 다운로드"><FileSpreadsheet className="h-3.5 w-3.5" /></a>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 보낸 인보이스 */}
      <div>
        <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><Receipt className="h-4 w-4 text-rose-600" />보낸 인보이스 ({invoices.length})</h3>
        {invoices.length === 0 ? <p className="text-xs text-muted-foreground">발행한 인보이스가 없습니다. (결재관리 판매 행의 문서 아이콘으로 발행)</p> : (
          <div className="divide-y rounded-md border">
            {invoices.map((d) => (
              <div key={d.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                {d.invoiceKind && <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium inline-flex items-center gap-0.5", kindColor(d.invoiceKind))}>{d.invoiceKind === "SAMPLE" && <FlaskConical className="h-3 w-3" />}{kindKo(d.invoiceKind)}</span>}
                <Link href={`/quote/${d.id}`} className="flex-1 truncate font-medium hover:underline">{d.title}</Link>
                {d.amount != null && <span className="text-xs text-muted-foreground">{won(Number(d.amount))} {d.currency ?? "KRW"}</span>}
                {d.sentTo && <span className="text-[11px] text-blue-600">발송됨</span>}
                <Link href={`/quote/${d.id}`} className="rounded p-1 text-muted-foreground hover:bg-accent" title="보기/인쇄"><Printer className="h-3.5 w-3.5" /></Link>
                <a href={`/api/proposals/${d.id}/excel`} className="rounded p-1 text-emerald-600 hover:bg-accent" title="엑셀 다운로드"><FileSpreadsheet className="h-3.5 w-3.5" /></a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
