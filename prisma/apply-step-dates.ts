/**
 * 첨부 엑셀(Sheet1)의 단계 진행일을 프로젝트에 반영 (빠른 버전 + 진행표시).
 * 실행:  DATABASE_URL="<공개DB_URL>" npx tsx prisma/apply-step-dates.ts
 */
import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";
const prisma = new PrismaClient();

type Row = { orderNo: string | null; productName: string; steps: { name: string; date: string }[] };
const keyOf = (o: string | null, n: string) => `${o ?? ""}||${n}`;

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

async function main() {
  console.log("시작: 엑셀 진행일 읽는 중...");
  const rows: Row[] = JSON.parse(fs.readFileSync(path.join(__dirname, "import-data.json"), "utf-8"));
  const byKey = new Map<string, Map<string, string>>();
  for (const r of rows) if (!byKey.has(keyOf(r.orderNo, r.productName))) byKey.set(keyOf(r.orderNo, r.productName), new Map(r.steps.map((s) => [s.name, s.date])));

  const projects = await prisma.project.findMany({ select: { id: true, orderNo: true, productName: true } });
  console.log(`프로젝트 ${projects.length}건 처리 시작...`);

  // 기존 단계의 확인직원(staff) 보존용 맵
  const allSteps = await prisma.projectStep.findMany({ select: { projectId: true, name: true, staff: true } });
  const staffMap = new Map<string, string | null>();
  for (const s of allSteps) if (s.staff) staffMap.set(`${s.projectId}||${s.name}`, s.staff);

  let updated = 0; const unmatched: string[] = [];
  for (const p of projects) {
    const sd = byKey.get(keyOf(p.orderNo, p.productName));
    if (!sd) { unmatched.push(p.productName); continue; }

    // 단계 재생성 (확인직원 보존)
    await prisma.projectStep.deleteMany({ where: { projectId: p.id } });
    await prisma.projectStep.createMany({
      data: CANON.map((c) => {
        const d = sd.get(c.name);
        return {
          projectId: p.id, type: c.type as any, group: c.name, name: c.name, order: c.order,
          done: !!d, doneAt: d ? new Date(d) : null, staff: staffMap.get(`${p.id}||${c.name}`) ?? null,
        };
      }),
    });

    let cur = "";
    for (let i = STEP_ORDER.length - 1; i >= 0; i--) if (sd.has(STEP_ORDER[i])) { cur = STEP_ORDER[i]; break; }
    const dateCols: Record<string, Date | null> = {};
    for (const [nm, col] of Object.entries(DATE_COL)) { const d = sd.get(nm); dateCols[col] = d ? new Date(d) : null; }
    await prisma.project.update({ where: { id: p.id }, data: { status: cur, ...dateCols } });

    updated++;
    if (updated % 30 === 0) console.log(`  진행 ${updated}/${projects.length}...`);
  }

  console.log(`완료: 단계 진행일 반영 ${updated}/${projects.length} 프로젝트`);
  if (unmatched.length) console.log(`주의: 엑셀 매칭 실패 ${unmatched.length}건 (미반영) 예: ${unmatched.slice(0, 8).join(", ")}`);
}

main().then(() => prisma.$disconnect()).catch((e) => { console.error("오류:", e); prisma.$disconnect(); process.exit(1); });
