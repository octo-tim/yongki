/**
 * 기존 업무 데이터 전면 삭제 후 첨부 엑셀(Sheet1, 207행)로 갱신.
 *   - 삭제: 프로젝트/단계/결재/구매추가비용/제품/업무/회의록/진행사진/요청/로그 + 업체 + 공장
 *   - 유지: 로그인 사용자(User), 단계 템플릿(StepTemplate), 설정(StatusSetting)
 *   - 생성: 업체·공장(엑셀 distinct 명), 프로젝트 + 제품 + 13단계(진행일 있는 단계는 완료 처리)
 * 실행:  DATABASE_URL="<공개DB_URL>" npx tsx prisma/import-excel.ts
 */
import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

type Row = {
  productName: string; orderNo: string | null; orderDate: string | null; shipRequestDate: string | null;
  quantity: number | null; client: string | null; factory: string | null; manager: string | null;
  productPhoto: string | null; importantNote: string | null; note: string | null;
  steps: { name: string; date: string }[];
};

const CANON = [
  { type: "PRODUCTION", name: "고객의뢰", order: 0 },
  { type: "PRODUCTION", name: "공장주문", order: 1 },
  { type: "PRODUCTION", name: "계약금입금(공장)", order: 2 },
  { type: "PRODUCTION", name: "파일수령(업체)", order: 3 },
  { type: "PRODUCTION", name: "파일전달(공장)", order: 4 },
  { type: "PRODUCTION", name: "제작진행중", order: 5 },
  { type: "PRODUCTION", name: "중간검품", order: 6 },
  { type: "PRODUCTION", name: "생산완료", order: 7 },
  { type: "SHIPPING", name: "창고입고", order: 0 },
  { type: "SHIPPING", name: "검품", order: 1 },
  { type: "SHIPPING", name: "출고", order: 2 },
  { type: "SHIPPING", name: "한국도착", order: 3 },
  { type: "SHIPPING", name: "고객인도", order: 4 },
] as const;
const STEP_ORDER = CANON.map((c) => c.name);
const DATE_COL: Record<string, string> = {
  공장주문: "factoryOrderDate", 생산완료: "productionCompleteDate", 창고입고: "warehouseInDate",
  검품: "inspectionDate", 출고: "shipOutDate", 한국도착: "koreaArrivalDate", 고객인도: "customerDeliveryDate",
};
const D = (s: string | null) => (s ? new Date(s) : null);

async function wipe() {
  await prisma.progressPhoto.deleteMany({});
  await prisma.projectLog.deleteMany({});
  await prisma.workRequestUpdate.deleteMany({});
  await prisma.workRequest.deleteMany({});
  await prisma.meetingFile.deleteMany({});
  await prisma.meeting.deleteMany({});
  await prisma.clientRequest.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.costItem.deleteMany({});
  await prisma.projectStep.deleteMany({});
  await prisma.projectFile.deleteMany({});
  await prisma.projectMemo.deleteMany({});
  await prisma.projectNote.deleteMany({});
  await prisma.workLog.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.project.deleteMany({});
  await prisma.factory.deleteMany({});
  await prisma.client.deleteMany({});
  console.log("기존 데이터 삭제 완료 (사용자·템플릿·설정 유지)");
}

async function main() {
  const rows: Row[] = JSON.parse(fs.readFileSync(path.join(__dirname, "import-data.json"), "utf-8"));
  console.log(`엑셀 행수: ${rows.length}`);

  await wipe();

  // 업체/공장 생성 + 이름→id 매핑
  const clientNames = Array.from(new Set(rows.map((r) => r.client).filter(Boolean))) as string[];
  const factoryNames = Array.from(new Set(rows.map((r) => r.factory).filter(Boolean))) as string[];
  const clientMap = new Map<string, string>();
  const factoryMap = new Map<string, string>();
  for (const n of clientNames) { const c = await prisma.client.create({ data: { name: n } }); clientMap.set(n, c.id); }
  for (const n of factoryNames) { const f = await prisma.factory.create({ data: { name: n } }); factoryMap.set(n, f.id); }
  console.log(`업체 ${clientMap.size} · 공장 ${factoryMap.size} 생성`);

  // 담당자 이름 → 기존 User
  const users = await prisma.user.findMany({ select: { id: true, name: true } });
  const userMap = new Map(users.map((u) => [u.name, u.id]));
  const unmatched = new Set<string>();

  let made = 0;
  for (const r of rows) {
    const stepDate = new Map(r.steps.map((s) => [s.name, s.date]));
    // 현재 단계 = 진행일 있는 단계 중 가장 진행된 단계
    let cur = "";
    for (let i = STEP_ORDER.length - 1; i >= 0; i--) { if (stepDate.has(STEP_ORDER[i])) { cur = STEP_ORDER[i]; break; } }
    // 프로젝트 날짜 컬럼 동기화
    const dateCols: Record<string, Date> = {};
    for (const [nm, col] of Object.entries(DATE_COL)) { const d = stepDate.get(nm); if (d) dateCols[col] = new Date(d); }

    let managerId: string | null = null;
    if (r.manager) { const id = userMap.get(r.manager); if (id) managerId = id; else unmatched.add(r.manager); }

    const project = await prisma.project.create({
      data: {
        productName: r.productName,
        orderNo: r.orderNo,
        orderDate: D(r.orderDate),
        shipRequestDate: D(r.shipRequestDate),
        quantity: r.quantity ?? null,
        importantNote: r.importantNote,
        note: r.note,
        productPhoto: r.productPhoto,
        status: cur,
        clientId: r.client ? clientMap.get(r.client) ?? null : null,
        factoryId: r.factory ? factoryMap.get(r.factory) ?? null : null,
        managerId,
        ...dateCols,
      },
    });

    // 제품 1건 (수량)
    await prisma.product.create({
      data: {
        name: r.productName, quantity: r.quantity ?? null, projectId: project.id,
        factoryId: project.factoryId, clientId: project.clientId,
      },
    });

    // 13단계 생성 (진행일 있으면 완료)
    await prisma.projectStep.createMany({
      data: CANON.map((c) => {
        const d = stepDate.get(c.name);
        return { projectId: project.id, type: c.type as any, group: c.name, name: c.name, order: c.order, done: !!d, doneAt: d ? new Date(d) : null };
      }),
    });
    made++;
  }

  console.log(`프로젝트 ${made}건 생성 완료`);
  if (unmatched.size) console.log(`주의: 매칭 안 된 담당자(사용자 없음) → ${Array.from(unmatched).join(", ")} (담당자 미지정으로 생성)`);
}

main().then(() => prisma.$disconnect()).catch((e) => { console.error(e); prisma.$disconnect(); process.exit(1); });
