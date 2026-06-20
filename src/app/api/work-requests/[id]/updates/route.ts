import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { content, progressDate } = await req.json();
  if (!content?.trim()) return NextResponse.json({ error: "진행현황을 입력하세요." }, { status: 400 });
  if (!progressDate) return NextResponse.json({ error: "입력일을 선택하세요." }, { status: 400 });

  const upd = await prisma.workRequestUpdate.create({
    data: {
      requestId: params.id,
      content: content.trim(),
      progressDate: new Date(progressDate),
      createdById: (session.user as any).id,
    },
  });
  return NextResponse.json(upd);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const updateId = req.nextUrl.searchParams.get("updateId");
  if (!updateId) return NextResponse.json({ error: "updateId 필수" }, { status: 400 });
  await prisma.workRequestUpdate.delete({ where: { id: updateId } });
  return NextResponse.json({ ok: true });
}
