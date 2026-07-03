import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const b = await req.json();
  if (!b.question || !b.answer) return NextResponse.json({ error: "질문/답변 필수" }, { status: 400 });
  const item = await prisma.faqItem.create({
    data: { question: b.question, answer: b.answer, category: b.category || null, authorId: (session.user as any).id },
  });
  return NextResponse.json(item);
}
