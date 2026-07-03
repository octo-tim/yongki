import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role === "CLIENT") return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const b = await req.json();
  if (!b.email || !b.password || !b.name) return NextResponse.json({ error: "이메일/비밀번호/이름 필수" }, { status: 400 });
  const exists = await prisma.clientUser.findUnique({ where: { email: b.email } });
  if (exists) return NextResponse.json({ error: "이미 사용 중인 이메일입니다" }, { status: 400 });

  const hash = await bcrypt.hash(String(b.password), 10);
  const cu = await prisma.clientUser.create({ data: { clientId: params.id, email: b.email, password: hash, name: b.name } });
  return NextResponse.json({ id: cu.id, email: cu.email, name: cu.name });
}
