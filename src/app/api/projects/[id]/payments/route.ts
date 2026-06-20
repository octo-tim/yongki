import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const SIDES = ["PURCHASE", "SALES"];
const TYPES = ["DEPOSIT", "BALANCE"];

// 결재관리: (구매/판매)×(계약금/잔금) 슬롯 업서트
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { side, type, amount, receivedAt, method, memo } = await req.json();
  if (!SIDES.includes(side)) return NextResponse.json({ error: "구매/판매 구분 오류" }, { status: 400 });
  if (!TYPES.includes(type)) return NextResponse.json({ error: "계약금/잔금 구분 오류" }, { status: 400 });

  const amt = amount === "" || amount == null ? null : Number(amount);
  const data = {
    amount: amt != null && !isNaN(amt) ? amt : null,
    receivedAt: receivedAt ? new Date(receivedAt) : null,
    method: method || null,
    memo: memo || null,
  };

  const existing = await prisma.payment.findFirst({ where: { projectId: params.id, side, type } });
  const pay = existing
    ? await prisma.payment.update({ where: { id: existing.id }, data })
    : await prisma.payment.create({ data: { projectId: params.id, side, type, ...data } });

  const sideKo = side === "SALES" ? "판매" : "구매";
  const typeKo = type === "DEPOSIT" ? "계약금" : "잔금";
  await prisma.projectLog.create({
    data: { projectId: params.id, actorId: (session.user as any).id, action: "PAYMENT", message: `결재관리 ${sideKo} ${typeKo} ${data.amount != null ? data.amount.toLocaleString() + "원" : "-"}` },
  });
  return NextResponse.json(pay);
}
