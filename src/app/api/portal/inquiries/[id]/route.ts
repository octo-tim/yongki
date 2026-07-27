import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// 문의 확인 처리 — 고객이 "확인함"을 누르면 clientReadAt 기록 (파트너센터 상단 알림에서 제외)
export async function PATCH(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const role = (session.user as any).role;

  const inquiry = await prisma.clientInquiry.findUnique({ where: { id: params.id }, select: { clientId: true } });
  if (!inquiry) return NextResponse.json({ error: "문의 없음" }, { status: 404 });
  if (role === "CLIENT" && inquiry.clientId !== (session.user as any).clientId) return NextResponse.json({ error: "권한 없음" }, { status: 403 });

  await prisma.clientInquiry.update({ where: { id: params.id }, data: { clientReadAt: new Date() } });
  return NextResponse.json({ ok: true });
}
