import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const STATUSES = ["TODO", "DOING", "DONE", "HOLD"];
const toDate = (v: any) => (v ? new Date(v) : null);

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { projectId, assigneeId, content, startDate, endDate, status } = await req.json();
  if (!projectId) return NextResponse.json({ error: "프로젝트를 선택하세요." }, { status: 400 });
  if (!content?.trim()) return NextResponse.json({ error: "진행내역을 입력하세요." }, { status: 400 });

  const log = await prisma.workLog.create({
    data: {
      projectId,
      assigneeId: assigneeId || null,
      creatorId: (session.user as any).id, // 업무생성자 = 현재 로그인 사용자
      content: content.trim(),
      status: STATUSES.includes(status) ? status : "DOING",
      startDate: toDate(startDate),
      endDate: toDate(endDate),
    },
  });
  await prisma.projectLog.create({
    data: { projectId, actorId: (session.user as any).id, action: "WORKLOG", message: `진행업무 등록: ${content.trim().slice(0, 40)}` },
  });
  return NextResponse.json(log);
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id, status, assigneeId, startDate, endDate, content } = await req.json();
  if (!id) return NextResponse.json({ error: "id 필수" }, { status: 400 });

  const data: any = {};
  if (status !== undefined && STATUSES.includes(status)) data.status = status;
  if (assigneeId !== undefined) data.assigneeId = assigneeId || null;
  if (startDate !== undefined) data.startDate = toDate(startDate);
  if (endDate !== undefined) data.endDate = toDate(endDate);
  if (content !== undefined && content.trim()) data.content = content.trim();

  const log = await prisma.workLog.update({ where: { id }, data });
  return NextResponse.json(log);
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id 필수" }, { status: 400 });
  await prisma.workLog.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
