import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { COMPANY, quoteTotals, PROPOSAL_GREETINGS, INVOICE_GREETINGS, PROPOSAL_NOTES, INVOICE_NOTES, SAMPLE_INVOICE_GREETINGS, SAMPLE_INVOICE_NOTES, type QuoteItem } from "@/lib/company";
import { QuotationActions } from "@/components/quotation-actions";

export const dynamic = "force-dynamic";

const won = (n: number) => n.toLocaleString("ko-KR");

export default async function QuotePage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  const role = (session.user as any).role;

  const p = await prisma.proposal.findUnique({
    where: { id: params.id },
    include: { client: { select: { id: true, name: true, contact: true, email: true } }, creator: { select: { name: true } } },
  });
  if (!p) notFound();
  if (role === "CLIENT" && p.clientId !== (session.user as any).clientId) notFound();

  const isInvoice = (p as any).docType === "INVOICE";

  // 계약금/중도금/잔금 인보이스: 연결 프로젝트의 판매 전체금액·기납부액 계산
  let projectTotal = 0;
  let projectPaid = 0;
  const invKindForCalc = (p as any).invoiceKind as string | null;
  if (isInvoice && (p as any).projectId && (invKindForCalc === "DEPOSIT" || invKindForCalc === "INTERIM" || invKindForCalc === "BALANCE")) {
    const proj: any = await prisma.project.findUnique({
      where: { id: (p as any).projectId },
      select: {
        quantity: true,
        products: { orderBy: { createdAt: "asc" }, select: { quantity: true, salesPrice: true, salesCurrency: true, exchangeRate: true, salesVatRate: true } },
        payments: { where: { side: "SALES" }, select: { type: true, amount: true, receivedAt: true } },
      },
    });
    if (proj) {
      const prod = proj.products?.[0] ?? null;
      const qty = prod?.quantity ?? proj.quantity ?? 0;
      let unit = 0, vatRate = 10;
      if (prod) {
        const sp = Number(prod.salesPrice ?? 0);
        unit = prod.salesCurrency === "RMB" ? sp : (Number(prod.exchangeRate ?? 0) > 0 ? sp * Number(prod.exchangeRate) : sp);
        vatRate = Number(prod.salesVatRate ?? 10);
      }
      projectTotal = Math.round(qty * unit * (1 + vatRate / 100));
      // 기납부액: 입금일(receivedAt)이 기록된 판매 결제 합계
      projectPaid = (proj.payments || []).reduce((a: number, pay: any) => a + (pay.receivedAt ? Number(pay.amount || 0) : 0), 0);
    }
  }
  const isSample = isInvoice && (p as any).invoiceKind === "SAMPLE";
  const items = (Array.isArray(p.items) ? p.items : []) as unknown as QuoteItem[];
  const vat = p.vatApplied ?? isInvoice;
  const rawTotals = quoteTotals(items, vat);
  // 항목 없이 금액만 직접 입력해 발행한 경우, 저장된 amount를 청구금액으로 사용
  const storedAmount = Number((p as any).amount ?? 0);
  const t = (items.length === 0 && storedAmount > 0)
    ? { supply: vat ? Math.round(storedAmount / 1.1) : storedAmount, vat: vat ? storedAmount - Math.round(storedAmount / 1.1) : 0, total: storedAmount }
    : rawTotals;
  const depositPct: number = (p as any).depositPct ?? 30;
  const invoiceKind: string | null = (p as any).invoiceKind ?? null;
  const kindKo = invoiceKind === "DEPOSIT" ? "계약금" : invoiceKind === "INTERIM" ? "중도금" : invoiceKind === "BALANCE" ? "잔금" : invoiceKind === "SAMPLE" ? "샘플" : null;
  const deposit = Math.round((t.total * depositPct) / 100);
  const balance = t.total - deposit;
  // 계약금/중도금/잔금 인보이스: 표는 전체금액 기준으로 표기하고, 하단에 계약금·잔금 청구 행 표시
  const isSplitInvoice = isInvoice && (invoiceKind === "DEPOSIT" || invoiceKind === "INTERIM" || invoiceKind === "BALANCE") && projectTotal > 0;
  // 전체금액 기준 공급가액/부가세 (표시는 부가세 포함 전체금액에서 역산)
  const fullTotal = isSplitInvoice ? projectTotal : t.total;
  const fullSupply = isSplitInvoice ? (vat ? Math.round(projectTotal / 1.1) : projectTotal) : t.supply;
  const fullVat = isSplitInvoice ? (vat ? projectTotal - Math.round(projectTotal / 1.1) : 0) : t.vat;
  const fullDeposit = Math.round((fullTotal * 30) / 100);
  const fullBalance = fullTotal - fullDeposit;
  const ccy = p.currency ?? "KRW";
  const won2 = (n: number) => `${won(n)}${ccy === "KRW" ? "" : " " + ccy}`;
  const d = (v: Date | null) => (v ? new Date(v).toISOString().slice(0, 10) : "-");
  const greetings = isSample ? SAMPLE_INVOICE_GREETINGS : isInvoice ? INVOICE_GREETINGS : PROPOSAL_GREETINGS;
  const notes = isSample ? SAMPLE_INVOICE_NOTES : isInvoice ? INVOICE_NOTES : PROPOSAL_NOTES;

  return (
    <div className="min-h-screen bg-muted/30 py-6 print:bg-white print:py-0">
      <div className="mx-auto max-w-4xl space-y-3 px-4 print:max-w-none print:px-0">
        <div className="print:hidden">
          <QuotationActions proposalId={p.id} defaultEmail={p.client?.email ?? ""} isStaff={role !== "CLIENT"}
            sentTo={(p as any).sentTo ?? null} sentAt={(p as any).sentAt ? new Date((p as any).sentAt).toISOString().slice(0, 16).replace("T", " ") : null} />
        </div>

        <div className="rounded-lg border bg-white p-8 text-[13px] shadow-sm print:rounded-none print:border-0 print:p-4 print:shadow-none">
          {/* 헤더: 제목 + 브랜드 */}
          <div className="mb-4 flex items-start justify-between border-b-4 border-double border-foreground pb-2">
            <h1 className="pt-2 text-2xl font-black tracking-tight">{isSample ? "SAMPLE INVOICE" : isInvoice ? "INVOICE" : "상품공급 제안서"}</h1>
            <div className="text-right">
              <p className="text-2xl font-bold tracking-tight"><span className="text-foreground">Cosme</span><span className="text-muted-foreground">Pack</span></p>
              <p className="text-sm font-semibold">코스메팩</p>
            </div>
          </div>

          {/* 수신/금액 + 공급자 박스 */}
          <div className="mb-4 grid gap-4 sm:grid-cols-[1fr_340px]">
            <div className="space-y-1.5">
              <p className="border-b pb-1 text-base font-semibold">{p.client?.name ?? "-"} <span className="text-sm font-normal">貴下</span></p>
              <p>{kindKo && <span className="mr-1 rounded bg-yellow-200 px-1.5 py-0.5 text-xs font-bold">{kindKo} 청구</span>}<span className="font-semibold">{isInvoice ? "청구금액" : "제안금액"} :</span> <span className="text-base font-bold">₩{won(isSplitInvoice ? (invoiceKind === "DEPOSIT" ? fullDeposit : invoiceKind === "BALANCE" ? fullBalance : t.total) : t.total)}</span> <span className="text-muted-foreground">{vat ? "(부가세 포함)" : "(부가세 별도)"}</span></p>
              {projectTotal > 0 && (invKindForCalc === "DEPOSIT" || invKindForCalc === "INTERIM" || invKindForCalc === "BALANCE") && (
                <div className="mt-1 space-y-0.5 text-sm">
                  <p><span className="font-medium text-muted-foreground">전체금액 :</span> <span className="font-semibold">₩{won(projectTotal)}</span> <span className="text-xs text-muted-foreground">(부가세 포함)</span></p>
                  {invKindForCalc === "BALANCE" && (
                    <>
                      <p><span className="font-medium text-muted-foreground">납부완료금액 :</span> <span className="font-semibold text-emerald-700">₩{won(projectPaid)}</span></p>
                      <p><span className="font-medium text-muted-foreground">잔여 청구금액 :</span> <span className="font-bold text-rose-700">₩{won(Math.max(projectTotal - projectPaid, 0))}</span></p>
                    </>
                  )}
                </div>
              )}
              <p><span className="font-semibold">작성일자 :</span> {d(p.sentDate)} <span className="text-muted-foreground">(유효기간:30일)</span></p>
              <div className="pt-2 space-y-0.5 text-muted-foreground">
                {greetings.map((g, i) => <p key={i}>◎ {g}</p>)}
              </div>
            </div>
            <table className="h-fit w-full border-collapse text-xs">
              <tbody>
                <tr><td rowSpan={isInvoice ? 7 : 6} className="w-8 border bg-muted/40 px-1 py-1 text-center font-semibold">공<br/>급<br/>자</td>
                  <td className="w-16 border bg-muted/40 px-2 py-1 text-center">사업자NO</td><td className="border px-2 py-1 font-semibold tracking-wider">{COMPANY.bizNo}</td></tr>
                <tr><td className="border bg-muted/40 px-2 py-1 text-center">업체명</td><td className="border px-2 py-1">{COMPANY.name} <span className="float-right">대표 {COMPANY.ceo} (인)</span></td></tr>
                <tr><td className="border bg-muted/40 px-2 py-1 text-center">주소</td><td className="border px-2 py-1">{COMPANY.address}</td></tr>
                <tr><td className="border bg-muted/40 px-2 py-1 text-center">업태</td><td className="border px-2 py-1">{COMPANY.bizType} <span className="float-right">종목 {COMPANY.bizItem}</span></td></tr>
                <tr><td className="border bg-muted/40 px-2 py-1 text-center">전화</td><td className="border px-2 py-1">{COMPANY.tel} <span className="float-right">팩스 {COMPANY.fax}</span></td></tr>
                {isInvoice && <tr><td className="border bg-muted/40 px-2 py-1 text-center">입금계좌</td><td className="border px-2 py-1">{COMPANY.bank}</td></tr>}
                <tr><td className="border bg-muted/40 px-2 py-1 text-center">담당</td><td className="border px-2 py-1">{p.creator?.name ?? "-"}</td></tr>
              </tbody>
            </table>
          </div>

          {/* 항목 테이블 */}
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-muted/40 text-xs">
                <th className="w-8 border px-1 py-2">No</th>
                <th className="w-24 border px-2 py-2">제품사진</th>
                <th className="border px-2 py-2">제품명</th>
                <th className="w-32 border px-2 py-2">재원</th>
                <th className="w-16 border px-2 py-2">주문수량</th>
                <th className="w-20 border px-2 py-2">단가(ea)</th>
                <th className="w-24 border px-2 py-2">금액(₩)</th>
                <th className="w-56 border px-2 py-2">비고</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && <tr><td colSpan={8} className="border px-2 py-6 text-center text-muted-foreground">{p.productName ?? p.title}</td></tr>}
              {items.map((it, i) => (
                <tr key={i}>
                  <td className="border px-1 py-2 text-center">{i + 1}</td>
                  <td className="border p-1 text-center">
                    {it.photo ? <img src={it.photo} alt="" className="mx-auto h-16 w-16 object-cover" /> : <span className="text-xs text-muted-foreground">-</span>}
                  </td>
                  <td className="border px-2 py-2 text-center font-medium">{it.name}</td>
                  <td className="whitespace-pre-wrap border px-2 py-2 text-center text-xs">{it.spec || "-"}</td>
                  <td className="border px-2 py-2 text-right">{won(Number(it.qty) || 0)}</td>
                  <td className="border px-2 py-2 text-right">{Number(it.unitPrice ?? 0).toLocaleString("ko-KR", { maximumFractionDigits: 4 })}</td>
                  <td className="border px-2 py-2 text-right">{won((Number(it.qty) || 0) * (Number(it.unitPrice) || 0))}</td>
                  <td className="whitespace-pre-wrap border px-2 py-2 text-center text-xs">{it.remark || ""}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="font-medium">
              <tr><td colSpan={6} className="border px-2 py-1.5 text-center font-bold">합  계</td><td className="border px-2 py-1.5 text-right">{won(fullSupply)}</td><td className="border" /></tr>
              {vat && <>
                <tr><td colSpan={6} className="border px-2 py-1.5 text-center">부가가치세</td><td className="border px-2 py-1.5 text-right">{won(fullVat)}</td><td className="border" /></tr>
                <tr><td colSpan={6} className="border px-2 py-1.5 text-center font-bold">합계금액</td><td className="border px-2 py-1.5 text-right font-bold">{won(fullTotal)}</td><td className="border" /></tr>
              </>}
              {/* 전체 인보이스: 계약금·잔금 참고 표시 */}
              {isInvoice && !kindKo && <>
                <tr className="bg-yellow-200 font-bold"><td colSpan={6} className="border px-2 py-2 text-center">계약금 청구금액 ({depositPct}%)</td><td className="border px-2 py-2 text-right">{won(deposit)}</td><td className="border" /></tr>
                <tr><td colSpan={6} className="border px-2 py-1.5 text-center font-semibold">잔금 청구금액 ({100 - depositPct}%)</td><td className="border px-2 py-1.5 text-right">{won(balance)}</td><td className="border" /></tr>
              </>}
              {/* 계약금/중도금/잔금 인보이스: 전체금액에서 계약금·잔금 청구액 표시, 해당 종류 강조 */}
              {isSplitInvoice && <>
                <tr className={invoiceKind === "DEPOSIT" ? "bg-yellow-200 font-bold" : "font-semibold"}>
                  <td colSpan={6} className="border px-2 py-2 text-center">계약금 청구금액 (30%){invoiceKind === "DEPOSIT" && " ◀ 본 청구"}</td>
                  <td className="border px-2 py-2 text-right">{won(fullDeposit)}</td><td className="border" /></tr>
                <tr className={invoiceKind === "BALANCE" ? "bg-yellow-200 font-bold" : "font-semibold"}>
                  <td colSpan={6} className="border px-2 py-2 text-center">잔금 청구금액 (70%){invoiceKind === "BALANCE" && " ◀ 본 청구"}</td>
                  <td className="border px-2 py-2 text-right">{won(fullBalance)}</td><td className="border" /></tr>
                {invoiceKind === "BALANCE" && projectPaid > 0 && (
                  <tr className="text-emerald-700"><td colSpan={6} className="border px-2 py-1.5 text-center">납부완료금액</td><td className="border px-2 py-1.5 text-right">{won(projectPaid)}</td><td className="border" /></tr>
                )}
              </>}
            </tfoot>
          </table>

          {/* 참고사항 */}
          <div className="mt-5 space-y-2 text-xs leading-relaxed">
            <p className="font-semibold">◎ 참고사항</p>
            {notes.map((n, i) => <p key={i} className="whitespace-pre-wrap">{i + 1}. {n}</p>)}
            {p.note && <p className="whitespace-pre-wrap pt-1 font-medium">※ {p.note}</p>}
          </div>

          <p className="mt-6 border-t pt-2 text-right text-xs font-semibold">{COMPANY.footer}</p>
        </div>
      </div>
    </div>
  );
}
