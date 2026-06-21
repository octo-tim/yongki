import { prisma } from "@/lib/prisma";
import { furthestStep } from "@/lib/steps";

// 프로젝트의 status 컬럼은 '현재 단계명'을 저장한다(상태 개념 폐지 → 단계로 대치).
// 현재 단계 = 완료(기록)된 단계 중 가장 진행된 단계.
export async function recomputeProjectStatus(projectId: string, actorId?: string) {
  const [p, steps] = await Promise.all([
    prisma.project.findUnique({ where: { id: projectId }, select: { status: true } }),
    prisma.projectStep.findMany({ where: { projectId }, select: { name: true, done: true } }),
  ]);
  if (!p) return null;
  const next = furthestStep(steps) ?? "";
  if (next !== p.status) {
    await prisma.project.update({ where: { id: projectId }, data: { status: next } });
  }
  return next;
}

export async function recomputeAll() {
  const list = await prisma.project.findMany({ select: { id: true, status: true, steps: { select: { name: true, done: true } } } });
  const updates = [];
  for (const p of list) {
    const next = furthestStep(p.steps) ?? "";
    if (next !== p.status) updates.push(prisma.project.update({ where: { id: p.id }, data: { status: next } }));
  }
  if (updates.length) await prisma.$transaction(updates);
}
