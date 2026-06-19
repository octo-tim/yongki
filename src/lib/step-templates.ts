import { prisma } from "@/lib/prisma";
import { PRODUCTION_STEPS, SHIPPING_STEPS, defaultSteps } from "@/lib/steps";
import type { StepType } from "@prisma/client";

// 신규 프로젝트 생성 시 사용할 단계 목록 (활성 템플릿 기준, 없으면 정적 기본값)
export async function getNewProjectSteps(): Promise<{ type: StepType; name: string; order: number }[]> {
  try {
    const rows = await prisma.stepTemplate.findMany({
      where: { active: true },
      orderBy: [{ type: "asc" }, { order: "asc" }],
    });
    if (rows.length > 0) {
      return rows.map((r) => ({ type: r.type, name: r.name, order: r.order }));
    }
  } catch {
    /* 폴백 */
  }
  return defaultSteps();
}

// 관리 화면용: 템플릿이 없으면 기본 단계로 초기화
export async function ensureStepDefaults() {
  const count = await prisma.stepTemplate.count();
  if (count === 0) {
    const rows: { type: StepType; name: string; order: number }[] = [];
    PRODUCTION_STEPS.forEach((name, i) => rows.push({ type: "PRODUCTION", name, order: i }));
    SHIPPING_STEPS.forEach((name, i) => rows.push({ type: "SHIPPING", name, order: i }));
    await prisma.stepTemplate.createMany({ data: rows });
  }
}
