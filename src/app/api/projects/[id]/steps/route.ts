import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { stepId, done, doneAt } = await req.json();

  const data: any = {};
  if (typeof done === "boolean") {
    data.done = done;
    data.doneAt = done ? (doneAt ? new Date(doneAt) : new Date()) : null;
  }
  if (doneAt !== undefined) {
    data.doneAt = doneAt ? new Date(doneAt) : null;
    if (doneAt) data.done = true;
  }

  const step = await prisma.projectStep.update({ where: { id: stepId }, data });
  await prisma.projectLog.create({
    data: { projectId: params.id, actorId: (session.user as any).id, action: "STEP_UPDATE", message: `단계 '${step.name}' ${step.done ? "완료" : "해제"}` },
  });
  return NextResponse.json(step);
}
