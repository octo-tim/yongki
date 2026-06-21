import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { content, category, requestDate, startDate, endDate, assigneeId, clientId, factoryId, projectId } = await req.json();
  if (!content?.trim()) return NextResponse.json({ error: "요청사항을 입력하세요." }, { status: 400 });
  if (!requestDate) return NextResponse.json({ error: "요청일을 선택하세요." }, { status: 400 });

  const wr = await prisma.workRequest.create({
    data: {
      content: content.trim(),
      category: category || null,
      requestDate: new Date(requestDate),
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      requesterId: (session.user as any).id,
      assigneeId: assigneeId || null,
      clientId: clientId || null,
      factoryId: factoryId || null,
      projectId: projectId || null,
    },
  });
  return NextResponse.json(wr);
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id, done, category, startDate, endDate, content } = await req.json();
  if (!id) return NextResponse.json({ error: "id 필수" }, { status: 400 });
  const data: any = {};
  if (typeof done === "boolean") {
    data.done = done;
    data.doneAt = done ? new Date() : null;
    data.endDate = done ? new Date() : null; // 완료 시 완료일 자동
  }
  if (category !== undefined) data.category = category || null;
  if (startDate !== undefined) data.startDate = startDate ? new Date(startDate) : null;
  if (endDate !== undefined) data.endDate = endDate ? new Date(endDate) : null;
  if (content !== undefined && content?.trim()) data.content = content.trim();
  const wr = await prisma.workRequest.update({ where: { id }, data });
  return NextResponse.json(wr);
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id 필수" }, { status: 400 });
  await prisma.workRequest.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
