import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// 비밀번호 직접 수정 (평문 — 관리자·사용자 모두 확인 가능)
export async function PATCH(req: NextRequest, { params }: { params: { id: string; userId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role === "CLIENT") return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  const password = String(b.password || "").trim();
  if (!password) return NextResponse.json({ error: "비밀번호를 입력하세요" }, { status: 400 });
  await prisma.clientUser.updateMany({
    where: { id: params.userId, clientId: params.id },
    data: { password, passwordPlain: password },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string; userId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role === "CLIENT") return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  await prisma.clientUser.deleteMany({ where: { id: params.userId, clientId: params.id } });
  return NextResponse.json({ ok: true });
}
