/**
 * 모든 프로젝트의 진행단계를 아래 12단계로 재구성(매칭).
 *   고객의뢰 / 공장주문 / 계약금입금(공장) / 파일수령(업체) / 파일전달(공장) /
 *   중간검품 / 생산완료 / 창고입고 / 검품 / 출고 / 한국도착 / 고객인도
 * - 기존 단계의 완료여부/완료일/담당/메모는 '단계명' 기준으로 보존(괄호 표기 차이도 매칭).
 * - StepTemplate(기본 단계 템플릿)도 위 12단계로 재설정.
 * 실행:  DATABASE_URL="<공개DB_URL>" npx tsx prisma/match-steps.ts
 */
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const CANON = [
  { type: "PRODUCTION", name: "고객의뢰", order: 0 },
  { type: "PRODUCTION", name: "공장주문", order: 1 },
  { type: "PRODUCTION", name: "계약금입금(공장)", order: 2 },
  { type: "PRODUCTION", name: "파일수령(업체)", order: 3 },
  { type: "PRODUCTION", name: "파일전달(공장)", order: 4 },
  { type: "PRODUCTION", name: "중간검품", order: 5 },
  { type: "PRODUCTION", name: "생산완료", order: 6 },
  { type: "SHIPPING", name: "창고입고", order: 0 },
  { type: "SHIPPING", name: "검품", order: 1 },
  { type: "SHIPPING", name: "출고", order: 2 },
  { type: "SHIPPING", name: "한국도착", order: 3 },
  { type: "SHIPPING", name: "고객인도", order: 4 },
] as const;

const norm = (s: string) => s.replace(/\(.*?\)/g, "").replace(/\s/g, "").trim();

async function main() {
  // 1) 기본 단계 템플릿 재설정
  await prisma.stepTemplate.deleteMany({});
  for (const c of CANON) {
    await prisma.stepTemplate.create({ data: { type: c.type, group: c.name, name: c.name, order: c.order, active: true } });
  }

  // 2) 프로젝트별 단계 재구성 (완료/담당/메모 보존)
  const projects = await prisma.project.findMany({ select: { id: true } });
  let rebuilt = 0, preserved = 0;
  for (const proj of projects) {
    const existing = await prisma.projectStep.findMany({ where: { projectId: proj.id } });
    const byName = new Map<string, (typeof existing)[number]>();
    const byNorm = new Map<string, (typeof existing)[number]>();
    for (const s of existing) { byName.set(s.name, s); if (!byNorm.has(norm(s.name))) byNorm.set(norm(s.name), s); }

    await prisma.projectStep.deleteMany({ where: { projectId: proj.id } });
    for (const c of CANON) {
      const old = byName.get(c.name) ?? byNorm.get(norm(c.name));
      if (old && (old.done || old.staff || old.note || old.doneAt)) preserved++;
      await prisma.projectStep.create({
        data: {
          projectId: proj.id,
          type: c.type, group: c.name, name: c.name, order: c.order,
          done: old?.done ?? false,
          doneAt: old?.doneAt ?? null,
          staff: old?.staff ?? null,
          note: old?.note ?? null,
        },
      });
    }
    rebuilt++;
  }
  console.log(`단계 템플릿 12단계 재설정 완료`);
  console.log(`프로젝트 ${rebuilt}건 단계 재구성 · 기존 진행정보 보존 ${preserved}건`);
}

main().then(() => prisma.$disconnect()).catch((e) => { console.error(e); prisma.$disconnect(); process.exit(1); });
