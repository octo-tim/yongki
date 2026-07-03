import { COMPANY, quoteTotals, type QuoteItem } from "@/lib/company";

const won = (n: number) => n.toLocaleString("ko-KR");

export function quotationHtml(p: {
  title: string; sentDate: Date | null; validUntil: Date | null; note: string | null;
  vatApplied: boolean; currency: string | null; items: QuoteItem[]; productName: string | null;
  clientName: string; clientContact?: string | null; creatorName?: string | null;
}) {
  const { supply, vat, total } = quoteTotals(p.items, p.vatApplied);
  const ccy = p.currency ?? "KRW";
  const d = (v: Date | null) => (v ? new Date(v).toISOString().slice(0, 10) : "-");
  const td = 'style="border:1px solid #ccc;padding:6px 8px;font-size:13px"';
  const tdR = 'style="border:1px solid #ccc;padding:6px 8px;font-size:13px;text-align:right"';
  const tdC = 'style="border:1px solid #ccc;padding:6px 8px;font-size:13px;text-align:center"';
  const th = 'style="border:1px solid #ccc;padding:6px 8px;font-size:12px;background:#f3f4f6;text-align:center"';

  const rows = p.items.length
    ? p.items.map((it, i) => `<tr><td ${tdC}>${i + 1}</td><td ${td}>${it.name}</td><td ${tdC}>${it.spec || "-"}</td><td ${tdR}>${won(Number(it.qty) || 0)}</td><td ${tdR}>${Number(it.unitPrice ?? 0).toLocaleString("ko-KR", { maximumFractionDigits: 4 })}</td><td ${tdR}>${won((Number(it.qty) || 0) * (Number(it.unitPrice) || 0))}</td></tr>`).join("")
    : `<tr><td colspan="6" ${tdC}>${p.productName ?? p.title}</td></tr>`;

  return `<!DOCTYPE html><html><body style="font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif;color:#111;max-width:720px;margin:0 auto;padding:24px">
  <h1 style="text-align:center;letter-spacing:0.4em;font-size:26px;margin-bottom:24px">견 적 서</h1>
  <table width="100%" style="margin-bottom:16px"><tr>
    <td valign="top" style="font-size:14px;line-height:1.8">
      <strong style="font-size:17px">${p.clientName}</strong> 貴中<br/>
      ${p.clientContact ? `담당: ${p.clientContact}<br/>` : ""}
      견적일자: ${d(p.sentDate)}<br/>
      ${p.validUntil ? `유효기간: ${d(p.validUntil)} 까지<br/>` : ""}
      <span style="color:#666">아래와 같이 견적합니다.</span>
    </td>
    <td valign="top" width="300">
      <table width="100%" style="border-collapse:collapse;font-size:12px">
        ${[["등록번호", COMPANY.bizNo], ["상호", COMPANY.name], ["대표자", COMPANY.ceo], ["주소", COMPANY.address], ["전화", COMPANY.tel], ["담당", p.creatorName ?? "-"]]
          .map(([k, v]) => `<tr><td style="border:1px solid #ccc;background:#f3f4f6;padding:4px 8px;width:64px;text-align:center">${k}</td><td style="border:1px solid #ccc;padding:4px 8px">${v}</td></tr>`).join("")}
      </table>
    </td>
  </tr></table>
  <div style="border:2px solid #111;border-radius:6px;padding:10px 16px;margin-bottom:14px;display:flex;justify-content:space-between">
    <strong>합계금액 ${p.vatApplied ? "(부가세 포함)" : "(부가세 별도)"}</strong>
    <strong style="font-size:18px;float:right">${won(total)} ${ccy === "KRW" ? "원" : ccy}</strong>
  </div>
  <table width="100%" style="border-collapse:collapse">
    <thead><tr><th ${th} width="36">No</th><th ${th}>품목</th><th ${th} width="100">규격</th><th ${th} width="60">수량</th><th ${th} width="90">단가</th><th ${th} width="100">공급가액</th></tr></thead>
    <tbody>${rows}</tbody>
    <tfoot>
      <tr><td colspan="5" ${tdR}>공급가액</td><td ${tdR}>${won(supply)}</td></tr>
      <tr><td colspan="5" ${tdR}>부가세 (10%)</td><td ${tdR}>${p.vatApplied ? won(vat) : "-"}</td></tr>
      <tr style="background:#f3f4f6;font-weight:bold"><td colspan="5" ${tdR}>합계</td><td ${tdR}>${won(total)}</td></tr>
    </tfoot>
  </table>
  ${p.note ? `<p style="font-size:13px;margin-top:14px"><strong>비고</strong><br/><span style="color:#555;white-space:pre-wrap">${p.note}</span></p>` : ""}
  <div style="margin-top:28px;border-top:1px solid #ddd;padding-top:10px;text-align:center;font-size:11px;color:#777;line-height:1.7">
    <strong style="color:#111">${COMPANY.name}</strong><br/>
    ${COMPANY.address} · Tel ${COMPANY.tel} · 사업자등록번호 ${COMPANY.bizNo}<br/>
    통신판매업 신고번호 ${COMPANY.mailOrderNo} · 개인정보보호책임자 ${COMPANY.privacyOfficer}
  </div>
</body></html>`;
}
