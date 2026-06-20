import { prisma } from "@/lib/prisma";
import { statusFromSteps } from "@/lib/steps";

// 단일 프로젝트 상태를 단계 진행에서 재계산하고 변경 시 DB 반영
export async function recomputeProjectStatus(projectId: string, actorId?: string) {
  const [p, steps] = await Promise.all([
    prisma.project.findUnique({ where: { id: projectId }, select: { status: true } }),
    prisma.projectStep.findMany({ where: { projectId }, select: { name: true, done: true } }),
  ]);
  if (!p) return null;
  const next = statusFromSteps(steps);
  if (next !== p.status) {
    await prisma.project.update({ where: { id: projectId }, data: { status: next } });
    await prisma.projectLog.create({
      data: { projectId, actorId, action: "STATUS_CHANGE", message: `상태 자동변경: ${p.status} → ${next}` },
    });
  }
  return next;
}

// 전체 프로젝트 상태 일괄 재계산
export async function recomputeAll() {
  const list = await prisma.project.findMany({ select: { id: true, status: true, steps: { select: { name: true, done: true } } } });
  const updates = [];
  for (const p of list) {
    const next = statusFromSteps(p.steps);
    if (next !== p.status) updates.push(prisma.project.update({ where: { id: p.id }, data: { status: next } }));
  }
  if (updates.length) await prisma.$transaction(updates);
}
