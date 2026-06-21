/**
 * 기존 프로젝트의 status(준비/진행중/출고대기/완료 등 위상)를 '현재 단계명'으로 변환.
 *   현재 단계 = 완료(기록)된 단계 중 가장 진행된 단계. 없으면 "".
 * 실행:  DATABASE_URL="<공개DB_URL>" npx tsx prisma/status-to-step.ts
 */
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const STEP_ORDER = [
  "고객의뢰", "공장주문", "계약금입금(공장)", "파일수령(업체)", "파일전달(공장)",
  "중간검품", "생산완료", "창고입고", "검품", "출고", "한국도착", "고객인도",
];

function furthest(steps: { name: string; done: boolean }[]): string {
  const done = new Set(steps.filter((s) => s.done).map((s) => s.name));
  for (let i = STEP_ORDER.length - 1; i >= 0; i--) if (done.has(STEP_ORDER[i])) return STEP_ORDER[i];
  return "";
}

async function main() {
  const projects = await prisma.project.findMany({ select: { id: true, status: true, steps: { select: { name: true, done: true } } } });
  let changed = 0;
  for (const p of projects) {
    const next = furthest(p.steps);
    if (next !== p.status) { await prisma.project.update({ where: { id: p.id }, data: { status: next } }); changed++; }
  }
  console.log(`status → 현재 단계명 변환: ${changed}/${projects.length}건 변경`);
}

main().then(() => prisma.$disconnect()).catch((e) => { console.error(e); prisma.$disconnect(); process.exit(1); });
