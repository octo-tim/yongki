/**
 * 진행단계에서 상태 그룹(준비/진행중/출고대기/완료)을 제거하고 평면 12단계로 전환.
 *  - StepTemplate / ProjectStep 의 group 값을 '단계명'으로 통일 → 단계 보드가 상태 헤더 없이 평면 표시
 *  - 단계 자체(이름/순서/완료여부)는 변경하지 않음
 * 실행:  DATABASE_URL="<공개DB_URL>" npx tsx prisma/flatten-steps.ts
 */
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const NAMES = [
  "고객의뢰", "공장주문", "계약금입금(공장)",
  "파일수령(업체)", "파일전달(공장)", "중간검품", "생산완료",
  "창고입고", "검품", "출고", "한국도착", "고객인도",
];

async function main() {
  let t = 0, s = 0;
  for (const name of NAMES) {
    t += (await prisma.stepTemplate.updateMany({ where: { name }, data: { group: name } })).count;
    s += (await prisma.projectStep.updateMany({ where: { name }, data: { group: name } })).count;
  }
  console.log(`group 평면화 — StepTemplate ${t}건 · ProjectStep ${s}건`);
}

main().then(() => prisma.$disconnect()).catch((e) => { console.error(e); prisma.$disconnect(); process.exit(1); });
