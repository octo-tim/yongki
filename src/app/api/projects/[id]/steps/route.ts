import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { STEP_TO_PROJECT_DATE } from "@/lib/steps";
import { recomputeProjectStatus } from "@/lib/recompute";

// 단계 기록: 진행일(입력) + 로그인 담당자 자동. clear=true면 해당 단계 기록 삭제.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { name, doneAt, clear } = await req.json();
  if (!name) return NextResponse.json({ error: "단계명 필수" }, { status: 400 });

  const uid = (session.user as any).id as string;
  const me = await prisma.user.findUnique({ where: { id: uid }, select: { name: true } });
  const staffName = me?.name || (session.user as any).name || (session.user as any).email || "-";

  const step = await prisma.projectStep.findFirst({ where: { projectId: params.id, name } });
  if (!step) return NextResponse.json({ error: "단계 없음" }, { status: 404 });

  const data = clear
    ? { done: false, doneAt: null, staff: null }
    : { done: true, doneAt: doneAt ? new Date(doneAt) : new Date(), staff: staffName };
  const updated = await prisma.projectStep.update({ where: { id: step.id }, data });

  // 단계가 프로젝트 날짜 컬럼과 매핑되면 동기화 (엑셀 호환)
  const col = STEP_TO_PROJECT_DATE[updated.name];
  if (col) await prisma.project.update({ where: { id: params.id }, data: { [col]: updated.doneAt } as any });

  // 현재 단계(status): 기록 시 선택한 단계로 지정, 삭제 시 가장 진행된 단계로 재계산
  if (clear) {
    await recomputeProjectStatus(params.id, uid);
  } else {
    await prisma.project.update({ where: { id: params.id }, data: { status: name } });
  }

  await prisma.projectLog.create({
    data: {
      projectId: params.id, actorId: uid, action: clear ? "STEP_CLEAR" : "STEP_SET",
      message: clear ? `단계 기록 삭제: ${name}` : `단계 기록: ${name} (${(updated.doneAt ? new Date(updated.doneAt).toISOString().slice(0, 10) : "-")} · ${staffName})`,
    },
  });
  return NextResponse.json(updated);
}

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
