import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { name, amount } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "항목명을 입력하세요." }, { status: 400 });
  const item = await prisma.costItem.create({
    data: { projectId: params.id, name: name.trim(), amount: amount ? Number(amount) : 0 },
  });
  return NextResponse.json(item);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const costId = req.nextUrl.searchParams.get("costId");
  if (!costId) return NextResponse.json({ error: "costId 필수" }, { status: 400 });
  await prisma.costItem.deleteMany({ where: { id: costId, projectId: params.id } });
  return NextResponse.json({ ok: true });
}
