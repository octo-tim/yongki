import { COMPANY, quoteTotals, PROPOSAL_GREETINGS, INVOICE_GREETINGS, PROPOSAL_NOTES, INVOICE_NOTES, type QuoteItem } from "@/lib/company";

const won = (n: number) => n.toLocaleString("ko-KR");

export function quotationHtml(p: {
  title: string; docType: string; depositPct: number; sentDate: Date | null; validUntil: Date | null; note: string | null;
  vatApplied: boolean; currency: string | null; items: QuoteItem[]; productName: string | null;
  clientName: string; clientContact?: string | null; creatorName?: string | null;
}) {
  const isInvoice = p.docType === "INVOICE";
  const t = quoteTotals(p.items, p.vatApplied);
  const deposit = Math.round((t.total * p.depositPct) / 100);
  const balance = t.total - deposit;
  const d = (v: Date | null) => (v ? new Date(v).toISOString().slice(0, 10) : "-");
  const td = 'style="border:1px solid #bbb;padding:6px 8px;font-size:13px"';
  const tdR = 'style="border:1px solid #bbb;padding:6px 8px;font-size:13px;text-align:right"';
  const tdC = 'style="border:1px solid #bbb;padding:6px 8px;font-size:13px;text-align:center"';
  const th = 'style="border:1px solid #bbb;padding:6px 8px;font-size:12px;background:#f3f4f6;text-align:center"';
  const greetings = isInvoice ? INVOICE_GREETINGS : PROPOSAL_GREETINGS;
  const notes = isInvoice ? INVOICE_NOTES : PROPOSAL_NOTES;

  const rows = p.items.length
    ? p.items.map((it, i) => `<tr><td ${tdC}>${i + 1}</td><td ${tdC}><b>${it.name}</b></td><td ${tdC}><span style="white-space:pre-wrap;font-size:12px">${it.spec || "-"}</span></td><td ${tdR}>${won(Number(it.qty) || 0)}</td><td ${tdR}>${Number(it.unitPrice ?? 0).toLocaleString("ko-KR", { maximumFractionDigits: 4 })}</td><td ${tdR}>${won((Number(it.qty) || 0) * (Number(it.unitPrice) || 0))}</td><td ${tdC}><span style="white-space:pre-wrap;font-size:12px">${it.remark || ""}</span></td></tr>`).join("")
    : `<tr><td colspan="7" ${tdC}>${p.productName ?? p.title}</td></tr>`;

  return `<!DOCTYPE html><html><body style="font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif;color:#111;max-width:840px;margin:0 auto;padding:24px">
  <table width="100%" style="border-bottom:4px double #111;margin-bottom:14px"><tr>
    <td><h1 style="margin:6px 0;font-size:24px">${isInvoice ? "INVOICE" : "상품공급 제안서"}</h1></td>
    <td align="right"><span style="font-size:22px;font-weight:bold">Cosme<span style="color:#777">Pack</span></span><br/><b>코스메팩</b></td>
  </tr></table>
  <table width="100%" style="margin-bottom:14px"><tr>
    <td valign="top" style="font-size:14px;line-height:1.8">
      <b style="font-size:16px;border-bottom:1px solid #333">${p.clientName}</b> 貴下<br/>
      <b>${isInvoice ? "청구금액" : "제안금액"} :</b> <b style="font-size:16px">₩${won(t.total)}</b> <span style="color:#666">${p.vatApplied ? "(부가세 포함)" : "(부가세 별도)"}</span><br/>
      <b>작성일자 :</b> ${d(p.sentDate)} <span style="color:#666">(유효기간:30일)</span><br/>
      <span style="color:#555">${greetings.map((g) => "◎ " + g).join("<br/>")}</span>
    </td>
    <td valign="top" width="330">
      <table width="100%" style="border-collapse:collapse;font-size:12px">
        ${[["사업자NO", `<b>${COMPANY.bizNo}</b>`], ["업체명", `${COMPANY.name} &nbsp; 대표 ${COMPANY.ceo} (인)`], ["주소", COMPANY.address], ["업태", `${COMPANY.bizType} &nbsp; 종목 ${COMPANY.bizItem}`], ["전화", `${COMPANY.tel} &nbsp; 팩스 ${COMPANY.fax}`], ...(isInvoice ? [["입금계좌", COMPANY.bank]] : []), ["담당", p.creatorName ?? "-"]]
          .map(([k, v]) => `<tr><td style="border:1px solid #bbb;background:#f3f4f6;padding:4px 8px;width:60px;text-align:center">${k}</td><td style="border:1px solid #bbb;padding:4px 8px">${v}</td></tr>`).join("")}
      </table>
    </td>
  </tr></table>
  <table width="100%" style="border-collapse:collapse">
    <thead><tr><th ${th} width="30">No</th><th ${th}>제품명</th><th ${th} width="120">재원</th><th ${th} width="70">주문수량</th><th ${th} width="80">단가(ea)</th><th ${th} width="95">금액(₩)</th><th ${th} width="200">비고</th></tr></thead>
    <tbody>${rows}</tbody>
    <tfoot>
      <tr><td colspan="5" ${tdC}><b>합 계</b></td><td ${tdR}>${won(t.supply)}</td><td ${td}></td></tr>
      ${p.vatApplied ? `<tr><td colspan="5" ${tdC}>부가가치세</td><td ${tdR}>${won(t.vat)}</td><td ${td}></td></tr>
      <tr><td colspan="5" ${tdC}><b>합계금액</b></td><td ${tdR}><b>${won(t.total)}</b></td><td ${td}></td></tr>` : ""}
      ${isInvoice ? `<tr style="background:#fff59d;font-weight:bold"><td colspan="5" ${tdC}>계약금 청구금액 (${p.depositPct}%)</td><td ${tdR}>${won(deposit)}</td><td ${td}></td></tr>
      <tr><td colspan="5" ${tdC}><b>잔금 청구금액 (${100 - p.depositPct}%)</b></td><td ${tdR}>${won(balance)}</td><td ${td}></td></tr>` : ""}
    </tfoot>
  </table>
  <div style="margin-top:16px;font-size:12px;line-height:1.7">
    <b>◎ 참고사항</b><br/>
    ${notes.map((n, i) => `${i + 1}. ${n.replace(/\n/g, "<br/>&nbsp;&nbsp;&nbsp;")}`).join("<br/>")}
    ${p.note ? `<br/><b>※ ${p.note}</b>` : ""}
  </div>
  <p style="margin-top:22px;border-top:1px solid #ccc;padding-top:8px;text-align:right;font-size:12px"><b>${COMPANY.footer}</b></p>
</body></html>`;
}
