import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { projectId, assigneeId, content } = await req.json();
  if (!projectId) return NextResponse.json({ error: "프로젝트를 선택하세요." }, { status: 400 });
  if (!content?.trim()) return NextResponse.json({ error: "진행내역을 입력하세요." }, { status: 400 });

  const log = await prisma.workLog.create({
    data: { projectId, assigneeId: assigneeId || null, content: content.trim() },
  });
  // 프로젝트 변경이력에도 남김
  await prisma.projectLog.create({
    data: { projectId, actorId: (session.user as any).id, action: "WORKLOG", message: `진행업무 등록: ${content.trim().slice(0, 40)}` },
  });
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
