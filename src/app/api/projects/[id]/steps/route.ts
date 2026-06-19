import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { STEP_TO_PROJECT_DATE } from "@/lib/steps";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { stepId, done, doneAt, staff } = await req.json();

  const data: any = {};
  if (typeof done === "boolean") {
    data.done = done;
    if (done && doneAt === undefined) data.doneAt = new Date();
    if (!done) data.doneAt = null;
  }
  if (doneAt !== undefined) {
    data.doneAt = doneAt ? new Date(doneAt) : null;
    if (doneAt) data.done = true;
  }
  if (staff !== undefined) {
    data.staff = staff || null;
    if (staff) data.done = true;
  }

  const step = await prisma.projectStep.update({ where: { id: stepId }, data });

  // leaf 단계가 프로젝트 날짜 컬럼과 매핑되면 동기화 (엑셀 내보내기 호환)
  const col = STEP_TO_PROJECT_DATE[step.name];
  if (col) {
    await prisma.project.update({ where: { id: params.id }, data: { [col]: step.doneAt } as any });
  }

  await prisma.projectLog.create({
    data: {
      projectId: params.id, actorId: (session.user as any).id, action: "STEP_UPDATE",
      message: `단계 '${step.name}' ${step.done ? "완료" : "해제"}${step.staff ? ` · ${step.staff}` : ""}`,
    },
  });
  return NextResponse.json(step);
}
