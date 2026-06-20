/**
 * 단계는 그대로 두고, 프로젝트 '상태'만 새 규칙(가장 멀리 완료된 단계의 그룹)으로 다시 계산.
 *  - 완료(고객인도 done 또는 status="완료")는 완료 유지
 * 실행:  DATABASE_URL="<공개DB_URL>" npx tsx prisma/recompute-status.ts
 */
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const STEP_ORDER = [
  "고객의뢰", "공장주문", "계약금입금(공장)",
  "파일수령(업체)", "파일전달(공장)", "중간검품", "생산완료",
  "창고입고", "검품", "출고", "한국도착", "고객인도",
];
const STEP_STATUS: Record<string, string> = {
  "고객의뢰": "준비", "공장주문": "준비", "계약금입금(공장)": "준비",
  "파일수령(업체)": "진행중", "파일전달(공장)": "진행중", "중간검품": "진행중", "생산완료": "진행중",
  "창고입고": "출고대기", "검품": "출고대기", "출고": "출고대기", "한국도착": "출고대기",
  "고객인도": "완료",
};

function statusFromSteps(steps: { name: string; done: boolean }[]): string {
  const done = new Set(steps.filter((s) => s.done).map((s) => s.name));
  if (done.has("고객인도")) return "완료";
  for (let i = STEP_ORDER.length - 1; i >= 0; i--) {
    const name = STEP_ORDER[i];
    if (name === "고객인도") continue;
    if (done.has(name)) return STEP_STATUS[name];
  }
  return "준비";
}

async function main() {
  const projects = await prisma.project.findMany({
    select: { id: true, status: true, steps: { select: { name: true, done: true } } },
  });

  let changed = 0;
  for (const p of projects) {
    if (p.status === "완료") continue; // 완료는 유지
    const next = statusFromSteps(p.steps);
    if (next !== p.status) {
      await prisma.project.update({ where: { id: p.id }, data: { status: next } });
      changed++;
    }
  }
  console.log(`상태 재계산: ${changed}건 변경 / 총 ${projects.length}건`);

  const dist = await prisma.project.groupBy({ by: ["status"], _count: { _all: true } });
  console.log("상태 분포:", dist.map((d) => `${d.status}=${d._count._all}`).join(", "));
}

main().then(() => prisma.$disconnect()).catch((e) => { console.error(e); prisma.$disconnect(); process.exit(1); });
