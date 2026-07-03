import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const role = (session.user as any).role;
  const b = await req.json();
  const content = String(b.content || "").trim();
  if (!content) return NextResponse.json({ error: "내용 필수" }, { status: 400 });

  const inquiry = await prisma.clientInquiry.findUnique({ where: { id: params.id }, select: { clientId: true } });
  if (!inquiry) return NextResponse.json({ error: "문의 없음" }, { status: 404 });
  if (role === "CLIENT" && inquiry.clientId !== (session.user as any).clientId) return NextResponse.json({ error: "권한 없음" }, { status: 403 });

  const senderType = role === "CLIENT" ? "CLIENT" : "STAFF";
  const senderName = session.user?.name ?? (role === "CLIENT" ? "고객" : "담당자");

  await prisma.clientInquiryMessage.create({ data: { inquiryId: params.id, senderType, senderName, content } });
  await prisma.clientInquiry.update({ where: { id: params.id }, data: { status: senderType === "STAFF" ? "답변완료" : "답변대기" } });
  return NextResponse.json({ ok: true });
}
