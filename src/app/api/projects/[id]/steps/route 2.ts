import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { STEP_TO_PROJECT_DATE } from "@/lib/steps";
import { recomputeProjectStatus } from "@/lib/recompute";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { stepId, done, doneAt, staff } = await req.json();

  const cur = await prisma.projectStep.findUnique({ where: { id: stepId } });
  if (!cur) return NextResponse.json({ error: "not found" }, { status: 404 });

  // 들어온 값만 병합 (나머지는 기존값 유지)
  const finalDoneAt = doneAt !== undefined ? (doneAt ? new Date(doneAt) : null) : cur.doneAt;
  const finalStaff = staff !== undefined ? (staff || null) : cur.staff;
  // 빈칸 채우기 방식: 일자 또는 직원 중 하나라도 있으면 '완료(기록됨)'
  const finalDone = typeof done === "boolean" ? done : !!(finalDoneAt || finalStaff);

  const step = await prisma.projectStep.update({
    where: { id: stepId },
    data: { doneAt: finalDoneAt, staff: finalStaff, done: finalDone },
  });

  // leaf 단계가 프로젝트 날짜 컬럼과 매핑되면 동기화 (엑셀 내보내기 호환)
  const col = STEP_TO_PROJECT_DATE[step.name];
  if (col) {
    await prisma.project.update({ where: { id: params.id }, data: { [col]: step.doneAt } as any });
  }

  // 단계 진행에서 프로젝트 상태(준비/진행중/출고대기/완료) 자동 갱신
  await recomputeProjectStatus(params.id, (session.user as any).id);

  await prisma.projectLog.create({
    data: {
      projectId: params.id, actorId: (session.user as any).id, action: "STEP_UPDATE",
      message: `단계 '${step.name}' ${step.doneAt ? new Date(step.doneAt).toISOString().slice(0, 10) : "-"}${step.staff ? ` · ${step.staff}` : ""}`,
    },
  });
  return NextResponse.json(step);
}
