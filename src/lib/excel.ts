import ExcelJS from "exceljs";
import { STATUS_LABEL } from "@/lib/status";

type Row = {
  orderDate: Date | null; orderNo: string | null; productName: string;
  quantity: number | null; deposit: any; balance: any;
  status: string;
  clientName?: string | null; factoryName?: string | null; managerName?: string | null;
  factoryOrderDate: Date | null; expectedCompletionDate: Date | null; productionCompleteDate: Date | null;
  warehouseInDate: Date | null; inspectionDate: Date | null; shipOutDate: Date | null;
  koreaArrivalDate: Date | null; customerDeliveryDate: Date | null; note: string | null;
};

const d = (v: Date | null) => (v ? new Date(v).toISOString().slice(0, 10) : "");

export async function buildProjectsWorkbook(rows: Row[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "제작관리";
  const ws = wb.addWorksheet("프로젝트");

  ws.columns = [
    { header: "주문일자", key: "orderDate", width: 12 },
    { header: "주문번호", key: "orderNo", width: 16 },
    { header: "상품명", key: "productName", width: 36 },
    { header: "수량", key: "quantity", width: 10 },
    { header: "계약금", key: "deposit", width: 12 },
    { header: "잔금", key: "balance", width: 12 },
    { header: "업체명", key: "clientName", width: 16 },
    { header: "공장명", key: "factoryName", width: 24 },
    { header: "관리책임자", key: "managerName", width: 12 },
    { header: "상태", key: "status", width: 10 },
    { header: "공장주문일", key: "factoryOrderDate", width: 12 },
    { header: "완성예정일", key: "expectedCompletionDate", width: 12 },
    { header: "생산완료일", key: "productionCompleteDate", width: 12 },
    { header: "창고입고일", key: "warehouseInDate", width: 12 },
    { header: "검품일", key: "inspectionDate", width: 12 },
    { header: "출고일", key: "shipOutDate", width: 12 },
    { header: "한국도착일", key: "koreaArrivalDate", width: 12 },
    { header: "고객인도일", key: "customerDeliveryDate", width: 12 },
    { header: "특이사항", key: "note", width: 40 },
  ];

  ws.getRow(1).font = { bold: true };
  ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEFF3F8" } };

  for (const r of rows) {
    ws.addRow({
      orderDate: d(r.orderDate), orderNo: r.orderNo ?? "", productName: r.productName,
      quantity: r.quantity ?? "", deposit: r.deposit ? Number(r.deposit) : "",
      balance: r.balance ? Number(r.balance) : "",
      clientName: r.clientName ?? "", factoryName: r.factoryName ?? "", managerName: r.managerName ?? "",
      status: STATUS_LABEL[r.status],
      factoryOrderDate: d(r.factoryOrderDate), expectedCompletionDate: d(r.expectedCompletionDate),
      productionCompleteDate: d(r.productionCompleteDate), warehouseInDate: d(r.warehouseInDate),
      inspectionDate: d(r.inspectionDate), shipOutDate: d(r.shipOutDate),
      koreaArrivalDate: d(r.koreaArrivalDate), customerDeliveryDate: d(r.customerDeliveryDate),
      note: r.note ?? "",
    });
  }
  ws.autoFilter = { from: "A1", to: "S1" };
  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}
