import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { COMPANY, quoteTotals, type QuoteItem } from "@/lib/company";
import { QuotationActions } from "@/components/quotation-actions";

export const dynamic = "force-dynamic";

const won = (n: number) => n.toLocaleString("ko-KR");

export default async function QuotePage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  const role = (session.user as any).role;

  const p = await prisma.proposal.findUnique({
    where: { id: params.id },
    include: { client: { select: { id: true, name: true, representative: true, contact: true, phone: true, email: true, address: true, bizNo: true } }, creator: { select: { name: true } } },
  });
  if (!p) notFound();
  if (role === "CLIENT" && p.clientId !== (session.user as any).clientId) notFound();

  const items = (Array.isArray(p.items) ? p.items : []) as unknown as QuoteItem[];
  const { supply, vat, total } = quoteTotals(items, p.vatApplied ?? true);
  const ccy = p.currency ?? "KRW";
  const d = (v: Date | null) => (v ? new Date(v).toISOString().slice(0, 10) : "-");

  return (
    <div className="min-h-screen bg-muted/30 py-6 print:bg-white print:py-0">
      <div className="mx-auto max-w-3xl space-y-3 px-4 print:max-w-none print:px-0">
        <div className="print:hidden">
          <QuotationActions proposalId={p.id} defaultEmail={p.client?.email ?? ""} isStaff={role !== "CLIENT"} />
        </div>

        <div className="rounded-lg border bg-white p-8 shadow-sm print:rounded-none print:border-0 print:p-6 print:shadow-none">
          {/* 제목 */}
          <h1 className="mb-6 text-center text-3xl font-bold tracking-[0.5em]">견 적 서</h1>

          {/* 상단: 수신 / 공급자 */}
          <div className="mb-6 grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 text-sm">
              <p className="text-lg font-semibold">{p.client?.name ?? "-"} <span className="text-sm font-normal">貴中</span></p>
              {p.client?.contact && <p>담당: {p.client.contact}</p>}
              <p>견적일자: {d(p.sentDate)}</p>
              {p.validUntil && <p>유효기간: {d(p.validUntil)} 까지</p>}
              <p className="pt-2 text-muted-foreground">아래와 같이 견적합니다.</p>
            </div>
            <table className="h-fit w-full border-collapse text-xs">
              <tbody>
                {[
                  ["등록번호", COMPANY.bizNo],
                  ["상호", COMPANY.name],
                  ["대표자", COMPANY.ceo],
                  ["주소", COMPANY.address],
                  ["전화", COMPANY.tel],
                  ["담당", p.creator?.name ?? "-"],
                ].map(([k, v]) => (
                  <tr key={k}>
                    <td className="w-20 border bg-muted/40 px-2 py-1.5 text-center font-medium">{k}</td>
                    <td className="border px-2 py-1.5">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 합계 강조 */}
          <div className="mb-4 flex items-center justify-between rounded-md border-2 border-foreground px-4 py-2.5">
            <span className="font-semibold">합계금액 {p.vatApplied ? "(부가세 포함)" : "(부가세 별도)"}</span>
            <span className="text-xl font-bold">{won(total)} {ccy === "KRW" ? "원" : ccy}</span>
          </div>

          {/* 항목 테이블 */}
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-muted/40 text-xs">
                <th className="border px-2 py-2 w-10">No</th>
                <th className="border px-2 py-2">품목</th>
                <th className="border px-2 py-2 w-28">규격</th>
                <th className="border px-2 py-2 w-16">수량</th>
                <th className="border px-2 py-2 w-24">단가</th>
                <th className="border px-2 py-2 w-28">공급가액</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr><td colSpan={6} className="border px-2 py-6 text-center text-muted-foreground">{p.productName ?? p.title}</td></tr>
              )}
              {items.map((it, i) => (
                <tr key={i}>
                  <td className="border px-2 py-1.5 text-center">{i + 1}</td>
                  <td className="border px-2 py-1.5">{it.name}</td>
                  <td className="border px-2 py-1.5 text-center">{it.spec || "-"}</td>
                  <td className="border px-2 py-1.5 text-right">{won(Number(it.qty) || 0)}</td>
                  <td className="border px-2 py-1.5 text-right">{Number(it.unitPrice ?? 0).toLocaleString("ko-KR", { maximumFractionDigits: 4 })}</td>
                  <td className="border px-2 py-1.5 text-right">{won((Number(it.qty) || 0) * (Number(it.unitPrice) || 0))}</td>
                </tr>
              ))}
              {Array.from({ length: Math.max(0, 5 - items.length) }).map((_, i) => (
                <tr key={`e${i}`}><td className="border px-2 py-1.5">&nbsp;</td><td className="border" /><td className="border" /><td className="border" /><td className="border" /><td className="border" /></tr>
              ))}
            </tbody>
            <tfoot className="text-sm font-medium">
              <tr><td colSpan={5} className="border px-2 py-1.5 text-right">공급가액</td><td className="border px-2 py-1.5 text-right">{won(supply)}</td></tr>
              <tr><td colSpan={5} className="border px-2 py-1.5 text-right">부가세 (10%)</td><td className="border px-2 py-1.5 text-right">{p.vatApplied ? won(vat) : "-"}</td></tr>
              <tr className="bg-muted/40 font-bold"><td colSpan={5} className="border px-2 py-2 text-right">합계</td><td className="border px-2 py-2 text-right">{won(total)}</td></tr>
            </tfoot>
          </table>

          {/* 비고 */}
          {p.note && (
            <div className="mt-4 text-sm">
              <p className="font-medium">비고</p>
              <p className="whitespace-pre-wrap text-muted-foreground">{p.note}</p>
            </div>
          )}

          {/* 하단 회사 정보 */}
          <div className="mt-8 border-t pt-3 text-center text-[11px] leading-relaxed text-muted-foreground">
            <p className="font-semibold text-foreground">{COMPANY.name}</p>
            <p>{COMPANY.address} · Tel {COMPANY.tel} · 사업자등록번호 {COMPANY.bizNo}</p>
            <p>통신판매업 신고번호 {COMPANY.mailOrderNo} · 개인정보보호책임자 {COMPANY.privacyOfficer}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
