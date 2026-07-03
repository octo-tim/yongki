import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const b = await req.json();
  const data: any = {};
  if ("question" in b) data.question = b.question;
  if ("answer" in b) data.answer = b.answer;
  if ("category" in b) data.category = b.category || null;
  const item = await prisma.faqItem.update({ where: { id: params.id }, data });
  return NextResponse.json(item);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  await prisma.faqItem.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
