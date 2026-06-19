import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { type, amount, receivedAt, memo } = await req.json();
  if (type !== "DEPOSIT" && type !== "BALANCE") return NextResponse.json({ error: "구분을 선택하세요." }, { status: 400 });
  const amt = Number(amount);
  if (!amt || amt <= 0) return NextResponse.json({ error: "금액을 입력하세요." }, { status: 400 });
  if (!receivedAt) return NextResponse.json({ error: "수령일을 선택하세요." }, { status: 400 });

  const pay = await prisma.payment.create({
    data: { projectId: params.id, type, amount: amt, receivedAt: new Date(receivedAt), memo: memo || null },
  });
  await prisma.projectLog.create({
    data: { projectId: params.id, actorId: (session.user as any).id, action: "PAYMENT", message: `${type === "DEPOSIT" ? "계약금" : "잔금"} 수금 ${amt.toLocaleString()}원` },
  });
  return NextResponse.json(pay);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const paymentId = req.nextUrl.searchParams.get("paymentId");
  if (!paymentId) return NextResponse.json({ error: "paymentId 필수" }, { status: 400 });
  await prisma.payment.delete({ where: { id: paymentId } });
  return NextResponse.json({ ok: true });
}
