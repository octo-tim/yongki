import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { COMPANY, SAMPLE_INVOICE_NOTES, INVOICE_NOTES, PROPOSAL_NOTES } from "@/lib/company";
import ExcelJS from "exceljs";

// 인보이스/제안서를 엑셀(.xlsx)로 다운로드 (샘플 인보이스 양식 기반)
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const p: any = await prisma.proposal.findUnique({
    where: { id: params.id },
    select: {
      id: true, title: true, docType: true, invoiceKind: true, currency: true,
      amount: true, vatApplied: true, items: true, sentDate: true, note: true, productName: true,
      client: { select: { name: true } }, creator: { select: { name: true } },
    } as any,
  });
  if (!p) return NextResponse.json({ error: "문서 없음" }, { status: 404 });

  const isInvoice = p.docType === "INVOICE";
  const isSample = isInvoice && p.invoiceKind === "SAMPLE";
  const kindKo = p.invoiceKind === "DEPOSIT" ? "계약금" : p.invoiceKind === "BALANCE" ? "잔금" : p.invoiceKind === "SAMPLE" ? "샘플" : p.invoiceKind === "FULL" ? "전체" : "";
  const docTitle = isSample ? "SAMPLE INVOICE" : isInvoice ? "INVOICE" : "상품공급 제안서";
  const items: any[] = Array.isArray(p.items) ? p.items : [];
  const vat = p.vatApplied ?? isInvoice;

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(isInvoice ? "인보이스" : "제안서");
  ws.columns = [
    { width: 5 }, { width: 6 }, { width: 12 }, { width: 12 }, { width: 16 },
    { width: 10 }, { width: 12 }, { width: 10 }, { width: 12 }, { width: 12 }, { width: 12 },
  ];

  const thin: any = { style: "thin", color: { argb: "FF888888" } };
  const border = { top: thin, left: thin, bottom: thin, right: thin };
  const bold = { bold: true };
  const center: any = { horizontal: "center", vertical: "middle", wrapText: true };
  const right: any = { horizontal: "right", vertical: "middle" };

  // 제목
  ws.mergeCells("B2:E2");
  ws.getCell("B2").value = docTitle;
  ws.getCell("B2").font = { bold: true, size: 18 };

  // 공급자 정보 (우측)
  const supplier: [string, string][] = [
    ["사업자NO", COMPANY.bizNo],
    ["업체명", `${COMPANY.name}   대표: ${COMPANY.ceo}`],
    ["주소", COMPANY.address],
    ["업태 / 종목", `${COMPANY.bizType} / ${COMPANY.bizItem}`],
    ["전화 / 팩스", `${COMPANY.tel} / ${COMPANY.fax}`],
  ];
  if (isInvoice) supplier.push(["입금계좌", COMPANY.bank]);
  supplier.forEach(([k, v], i) => {
    const r = 3 + i;
    ws.getCell(`H${r}`).value = k; ws.getCell(`H${r}`).font = bold; ws.getCell(`H${r}`).border = border; ws.getCell(`H${r}`).alignment = center;
    ws.mergeCells(`I${r}:K${r}`);
    ws.getCell(`I${r}`).value = v; ws.getCell(`I${r}`).border = border;
  });

  // 좌측: 청구/작성 정보
  ws.getCell("C4").value = `${p.client?.name ?? "-"} 貴下`; ws.getCell("C4").font = { bold: true, size: 12 };
  ws.getCell("C6").value = (isInvoice ? "청구금액 :" : "제안금액 :"); ws.getCell("C6").font = bold;
  ws.getCell("C7").value = `${isInvoice ? "작성" : "견적"}일자 :`; ws.getCell("C7").font = bold;
  ws.getCell("D7").value = p.sentDate ? new Date(p.sentDate).toISOString().slice(0, 10) : "";
  ws.getCell("E7").value = "(유효기간: 30일)";

  // 항목 표 헤더
  const headRow = 10;
  const heads = ["No", "제품명", "규격", "수량", "단가", "금액", "비고"];
  const headCols = ["B", "C", "E", "G", "H", "I", "K"];
  const headSpan: Record<string, string> = { C: "D", I: "J" };
  heads.forEach((h, i) => {
    const col = headCols[i];
    const cell = ws.getCell(`${col}${headRow}`);
    cell.value = h; cell.font = bold; cell.alignment = center;
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0F0F0" } } as any;
    cell.border = border;
    if (headSpan[col]) { ws.mergeCells(`${col}${headRow}:${headSpan[col]}${headRow}`); ws.getCell(`${headSpan[col]}${headRow}`).border = border; }
  });

  // 항목 행
  let supply = 0;
  let r = headRow + 1;
  const rows = items.length ? items : [{ name: p.productName ?? p.title, spec: "", qty: 0, unitPrice: 0, remark: "" }];
  rows.forEach((it, i) => {
    const qty = Number(it.qty) || 0, unit = Number(it.unitPrice) || 0, amt = qty * unit;
    supply += amt;
    ws.getCell(`B${r}`).value = i + 1; ws.getCell(`B${r}`).alignment = center; ws.getCell(`B${r}`).border = border;
    ws.mergeCells(`C${r}:D${r}`); ws.getCell(`C${r}`).value = it.name ?? ""; ws.getCell(`C${r}`).border = border; ws.getCell(`D${r}`).border = border;
    ws.getCell(`E${r}`).value = it.spec ?? ""; ws.getCell(`E${r}`).border = border; ws.getCell(`E${r}`).alignment = center;
    ws.getCell(`G${r}`).value = qty; ws.getCell(`G${r}`).alignment = right; ws.getCell(`G${r}`).border = border;
    ws.getCell(`H${r}`).value = unit; ws.getCell(`H${r}`).numFmt = "#,##0"; ws.getCell(`H${r}`).alignment = right; ws.getCell(`H${r}`).border = border;
    ws.mergeCells(`I${r}:J${r}`); ws.getCell(`I${r}`).value = amt; ws.getCell(`I${r}`).numFmt = "#,##0"; ws.getCell(`I${r}`).alignment = right; ws.getCell(`I${r}`).border = border; ws.getCell(`J${r}`).border = border;
    ws.getCell(`K${r}`).value = it.remark ?? ""; ws.getCell(`K${r}`).border = border; ws.getCell(`K${r}`).alignment = center;
    r++;
  });

  // 합계 / 부가세 / 합계금액
  // 항목 없이 금액만 직접 입력해 발행한 경우, 저장된 amount를 청구금액으로 사용
  const storedAmount = Number(p.amount ?? 0);
  if (items.length === 0 && storedAmount > 0) {
    supply = vat ? Math.round(storedAmount / 1.1) : storedAmount;
  }
  const vatAmt = vat ? Math.round(supply * 0.1) : 0;
  const totalAmt = supply + vatAmt;
  // 제안서(부가세 별도)는 합계행만, 인보이스/부가세 포함은 합계·부가세·합계금액 3행
  const sumRows: [string, number][] = vat
    ? [["합   계", supply], ["부가가치세", vatAmt], ["합계금액", totalAmt]]
    : [["합   계", supply]];
  sumRows.forEach(([label, val]) => {
    ws.mergeCells(`B${r}:H${r}`);
    ws.getCell(`B${r}`).value = label; ws.getCell(`B${r}`).font = bold; ws.getCell(`B${r}`).alignment = right; ws.getCell(`B${r}`).border = border;
    ws.mergeCells(`I${r}:J${r}`);
    ws.getCell(`I${r}`).value = val; ws.getCell(`I${r}`).numFmt = "#,##0"; ws.getCell(`I${r}`).font = bold; ws.getCell(`I${r}`).alignment = right; ws.getCell(`I${r}`).border = border; ws.getCell(`J${r}`).border = border;
    ws.getCell(`K${r}`).border = border;
    r++;
  });

  // 청구금액 채우기 (상단)
  ws.getCell("D6").value = totalAmt; ws.getCell("D6").numFmt = "#,##0"; ws.getCell("D6").font = { bold: true, size: 12 };
  ws.getCell("F6").value = vat ? "(부가세 포함)" : "(부가세 별도)";

  // 참고사항
  r += 1;
  ws.getCell(`C${r}`).value = "◎ 참고사항"; ws.getCell(`C${r}`).font = bold; r++;
  const notes = isSample ? SAMPLE_INVOICE_NOTES : isInvoice ? INVOICE_NOTES : PROPOSAL_NOTES;
  notes.forEach((nt, i) => {
    ws.mergeCells(`C${r}:K${r}`);
    ws.getCell(`C${r}`).value = `${i + 1}. ${nt}`;
    ws.getCell(`C${r}`).alignment = { vertical: "top", wrapText: true } as any;
    ws.getRow(r).height = 28;
    r++;
  });

  // 하단 회사명
  r += 1;
  ws.mergeCells(`I${r}:K${r}`);
  ws.getCell(`I${r}`).value = COMPANY.name; ws.getCell(`I${r}`).font = { bold: true, size: 12 }; ws.getCell(`I${r}`).alignment = center;

  const buf = await wb.xlsx.writeBuffer();
  const fname = `${(p.productName || p.title || "invoice")}_${kindKo || (isInvoice ? "인보이스" : "제안서")}.xlsx`;
  return new NextResponse(buf as any, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fname)}`,
    },
  });
}
