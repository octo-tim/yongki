/**
 * '정리' 시트(정제본)로 전면 재구성: 중복 병합(76공장·46업체) + 프로젝트연결 + 진행일 업데이트.
 *   삭제: 프로젝트/단계/결재/구매추가비용/제품/업무/회의/진행사진/요청/로그 + 공장 + 업체
 *   유지: 사용자 계정 · 단계템플릿 · 설정
 * 실행:  DATABASE_URL="<공개DB_URL>" npx tsx prisma/import-v2.ts
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
const t = (s: string | null) => (s ? s.trim() : null);
const CANON = [
  { type: "PRODUCTION", name: "고객의뢰", order: 0 }, { type: "PRODUCTION", name: "공장주문", order: 1 },
  { type: "PRODUCTION", name: "계약금입금(공장)", order: 2 }, { type: "PRODUCTION", name: "파일수령(업체)", order: 3 },
  { type: "PRODUCTION", name: "파일전달(공장)", order: 4 }, { type: "PRODUCTION", name: "제작진행중", order: 5 },
  { type: "PRODUCTION", name: "중간검품", order: 6 }, { type: "PRODUCTION", name: "생산완료", order: 7 },
  { type: "SHIPPING", name: "창고입고", order: 0 }, { type: "SHIPPING", name: "검품", order: 1 },
  { type: "SHIPPING", name: "출고", order: 2 }, { type: "SHIPPING", name: "한국도착", order: 3 },
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
}

async function main() {
  console.log("시작: '정리' 시트 데이터 읽는 중...");
  const rows: Row[] = JSON.parse(fs.readFileSync(path.join(__dirname, "import-data-v2.json"), "utf-8"));
  console.log(`행수 ${rows.length}`);

  await wipe();
  console.log("기존 데이터 삭제 완료 (사용자/템플릿 유지)");

  const clientNames = Array.from(new Set(rows.map((r) => t(r.client)).filter(Boolean))) as string[];
  const factoryNames = Array.from(new Set(rows.map((r) => t(r.factory)).filter(Boolean))) as string[];
  const clientMap = new Map<string, string>();
  const factoryMap = new Map<string, string>();
  for (const n of clientNames) { const c = await prisma.client.create({ data: { name: n } }); clientMap.set(n, c.id); }
  for (const n of factoryNames) { const f = await prisma.factory.create({ data: { name: n } }); factoryMap.set(n, f.id); }
  console.log(`업체 ${clientMap.size} · 공장 ${factoryMap.size} 생성`);

  const users = await prisma.user.findMany({ select: { id: true, name: true } });
  const userMap = new Map(users.map((u) => [u.name, u.id]));
  const unmatched = new Set<string>();

  let made = 0;
  for (const r of rows) {
    const sd = new Map(r.steps.map((s) => [s.name, s.date]));
    let cur = "";
    for (let i = STEP_ORDER.length - 1; i >= 0; i--) if (sd.has(STEP_ORDER[i])) { cur = STEP_ORDER[i]; break; }
    const dateCols: Record<string, Date> = {};
    for (const [nm, col] of Object.entries(DATE_COL)) { const d = sd.get(nm); if (d) dateCols[col] = new Date(d); }
    let managerId: string | null = null;
    if (r.manager) { const id = userMap.get(r.manager); if (id) managerId = id; else unmatched.add(r.manager); }
    const cId = t(r.client) ? clientMap.get(t(r.client)!) ?? null : null;
    const fId = t(r.factory) ? factoryMap.get(t(r.factory)!) ?? null : null;

    const project = await prisma.project.create({
      data: {
        productName: r.productName, orderNo: r.orderNo, orderDate: D(r.orderDate), shipRequestDate: D(r.shipRequestDate),
        quantity: r.quantity ?? null, importantNote: r.importantNote, note: r.note, productPhoto: r.productPhoto,
        status: cur, clientId: cId, factoryId: fId, managerId, ...dateCols,
      },
    });
    await prisma.product.create({ data: { name: r.productName, quantity: r.quantity ?? null, projectId: project.id, factoryId: fId, clientId: cId } });
    await prisma.projectStep.createMany({
      data: CANON.map((c) => { const d = sd.get(c.name); return { projectId: project.id, type: c.type as any, group: c.name, name: c.name, order: c.order, done: !!d, doneAt: d ? new Date(d) : null }; }),
    });
    made++;
    if (made % 30 === 0) console.log(`  진행 ${made}/${rows.length}...`);
  }

  console.log(`완료: 프로젝트 ${made} · 업체 ${clientMap.size} · 공장 ${factoryMap.size}`);
  if (unmatched.size) console.log(`주의: 매칭 안 된 담당자 → ${Array.from(unmatched).join(", ")} (미지정)`);
}

main().then(() => prisma.$disconnect()).catch((e) => { console.error("오류:", e); prisma.$disconnect(); process.exit(1); });
