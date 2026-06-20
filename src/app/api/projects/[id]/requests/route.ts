import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { content, requestDate } = await req.json();
  if (!content?.trim()) return NextResponse.json({ error: "요청 내용을 입력하세요." }, { status: 400 });
  if (!requestDate) return NextResponse.json({ error: "요청 날짜를 선택하세요." }, { status: 400 });

  const reqItem = await prisma.clientRequest.create({
    data: { projectId: params.id, content: content.trim(), requestDate: new Date(requestDate), createdById: (session.user as any).id },
  });
  return NextResponse.json(reqItem);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const reqId = req.nextUrl.searchParams.get("requestId");
  if (!reqId) return NextResponse.json({ error: "requestId 필수" }, { status: 400 });
  await prisma.clientRequest.delete({ where: { id: reqId } });
  return NextResponse.json({ ok: true });
}
