import { PrismaClient } from "@prisma/client";
import { CANON_STEPS } from "../src/lib/steps";

const prisma = new PrismaClient();

// 구 단계명 → 신 단계명 (일자/직원 데이터 이관용). 신규명은 그대로 자기 매칭.
const OLD_TO_NEW: Record<string, string> = {
  공장주문일자: "공장주문",
  공장주문: "공장주문",
  파일수령: "파일수령(업체)",
  "파일수령(업체)": "파일수령(업체)",
  파일전달: "파일전달(공장)",
  "파일전달(공장)": "파일전달(공장)",
  "계약금입금(공장)": "계약금입금(공장)",
  중간검품: "중간검품",
  생산완료: "생산완료",
  창고입고: "창고입고",
  검품: "검품",
  출고: "출고",
  한국도착: "한국도착",
  고객인도: "고객인도",
  // 제거 대상(완성예정일/생산시작/생산중간/포장시작)은 매핑 없음 → 무시
};

async function main() {
  console.log("🔧 단계 구조 이관 시작");

  // 1) 단계 템플릿 재설정 (신규 프로젝트가 새 구조를 쓰도록)
  await prisma.stepTemplate.deleteMany();
  await prisma.stepTemplate.createMany({
    data: CANON_STEPS.map((s) => ({ type: s.type, group: s.group, name: s.name, order: s.order })),
  });

  // 2) 각 프로젝트 단계 재구성 (일자/직원 보존, 그 외 데이터 무손상)
  const projects = await prisma.project.findMany({ include: { steps: true } });
  let migrated = 0;
  for (const p of projects) {
    const dataByNew = new Map<string, { doneAt: Date | null; staff: string | null }>();
    for (const s of p.steps) {
      const newName = OLD_TO_NEW[s.name];
      if (newName && (s.doneAt || s.staff) && !dataByNew.has(newName)) {
        dataByNew.set(newName, { doneAt: s.doneAt, staff: s.staff });
      }
    }
    await prisma.projectStep.deleteMany({ where: { projectId: p.id } });
    await prisma.projectStep.createMany({
      data: CANON_STEPS.map((c) => {
        const d = dataByNew.get(c.name);
        return {
          projectId: p.id, type: c.type, group: c.group, name: c.name, order: c.order,
          doneAt: d?.doneAt ?? null, staff: d?.staff ?? null, done: !!(d?.doneAt || d?.staff),
        };
      }),
    });
    migrated++;
  }
  console.log(`✅ 이관 완료: 프로젝트 ${migrated}건 / 템플릿 ${CANON_STEPS.length}단계`);
}

main().catch((e) => { console.error("❌ 이관 실패:", e); process.exit(1); }).finally(() => prisma.$disconnect());
