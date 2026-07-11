import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// 문의 상태 변경 (직원이 대시보드에서 "확인" 처리 → 답변완료로 리스트에서 제외)
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role === "CLIENT") return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  const status = typeof b.status === "string" ? b.status : "답변완료";
  const r = await prisma.clientInquiry.update({ where: { id: params.id }, data: { status } });
  return NextResponse.json({ ok: true, id: r.id });
}
