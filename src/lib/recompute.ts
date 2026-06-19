import { prisma } from "@/lib/prisma";
import { computeStatus } from "@/lib/status";

// 단일 프로젝트의 상태를 재계산하고 변경 시 DB 반영 + 로그
export async function recomputeProject(projectId: string, actorId?: string) {
  const p = await prisma.project.findUnique({ where: { id: projectId } });
  if (!p) return null;
  const next = computeStatus({
    manualHold: p.manualHold,
    expectedCompletionDate: p.expectedCompletionDate,
    productionCompleteDate: p.productionCompleteDate,
    shipOutDate: p.shipOutDate,
    koreaArrivalDate: p.koreaArrivalDate,
    customerDeliveryDate: p.customerDeliveryDate,
  });
  if (next !== p.status) {
    await prisma.project.update({ where: { id: projectId }, data: { status: next } });
    await prisma.projectLog.create({
      data: { projectId, actorId, action: "STATUS_CHANGE", message: `상태 자동변경: ${p.status} → ${next}` },
    });
  }
  return next;
}

// 전체 프로젝트 상태 일괄 재계산 (대시보드/목록 진입 시 지연 상태 갱신용)
export async function recomputeAll() {
  const list = await prisma.project.findMany({ select: { id: true, status: true, manualHold: true, expectedCompletionDate: true, productionCompleteDate: true, shipOutDate: true, koreaArrivalDate: true, customerDeliveryDate: true } });
  const updates = [];
  for (const p of list) {
    const next = computeStatus(p);
    if (next !== p.status) updates.push(prisma.project.update({ where: { id: p.id }, data: { status: next } }));
  }
  if (updates.length) await prisma.$transaction(updates);
}
