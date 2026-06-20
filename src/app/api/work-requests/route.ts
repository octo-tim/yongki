import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { content, requestDate, assigneeId, clientId, factoryId, projectId } = await req.json();
  if (!content?.trim()) return NextResponse.json({ error: "요청사항을 입력하세요." }, { status: 400 });
  if (!requestDate) return NextResponse.json({ error: "요청일을 선택하세요." }, { status: 400 });

  const wr = await prisma.workRequest.create({
    data: {
      content: content.trim(),
      requestDate: new Date(requestDate),
      requesterId: (session.user as any).id,
      assigneeId: assigneeId || null,
      clientId: clientId || null,
      factoryId: factoryId || null,
      projectId: projectId || null,
    },
  });
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
