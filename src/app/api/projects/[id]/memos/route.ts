import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { content } = await req.json();
  if (!content?.trim()) return NextResponse.json({ error: "내용 필수" }, { status: 400 });
  const memo = await prisma.projectMemo.create({
    data: { projectId: params.id, authorId: (session.user as any).id, content },
  });
  return NextResponse.json(memo);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const memoId = req.nextUrl.searchParams.get("memoId");
  if (!memoId) return NextResponse.json({ error: "memoId 필수" }, { status: 400 });
  await prisma.projectMemo.delete({ where: { id: memoId } });
  return NextResponse.json({ ok: true });
}
