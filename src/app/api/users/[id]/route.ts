import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session) return { error: "unauthorized", status: 401 } as const;
  if ((session.user as any).role !== "ADMIN") return { error: "forbidden", status: 403 } as const;
  return { session } as const;
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const b = await req.json();
  const data: Record<string, any> = {};
  if (typeof b.name === "string" && b.name.trim()) data.name = b.name.trim();
  if (typeof b.email === "string" && b.email.trim()) data.email = b.email.trim();
  if (b.role === "ADMIN" || b.role === "STAFF") data.role = b.role;
  if (b.password) data.password = await bcrypt.hash(b.password, 10);

  // 마지막 관리자의 권한 강등 방지
  if (data.role === "STAFF") {
    const target = await prisma.user.findUnique({ where: { id: params.id } });
    if (target?.role === "ADMIN") {
      const admins = await prisma.user.count({ where: { role: "ADMIN" } });
      if (admins <= 1) return NextResponse.json({ error: "마지막 관리자의 권한은 변경할 수 없습니다." }, { status: 400 });
    }
  }

  try {
    const u = await prisma.user.update({ where: { id: params.id }, data });
    return NextResponse.json({ id: u.id, email: u.email, name: u.name, role: u.role });
  } catch (e: any) {
    if (e?.code === "P2002") return NextResponse.json({ error: "이미 존재하는 아이디입니다." }, { status: 400 });
    throw e;
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  if ((auth.session.user as any).id === params.id) {
    return NextResponse.json({ error: "본인 계정은 삭제할 수 없습니다." }, { status: 400 });
  }
  const target = await prisma.user.findUnique({ where: { id: params.id } });
  if (!target) return NextResponse.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 });
  if (target.role === "ADMIN") {
    const admins = await prisma.user.count({ where: { role: "ADMIN" } });
    if (admins <= 1) return NextResponse.json({ error: "마지막 관리자는 삭제할 수 없습니다." }, { status: 400 });
  }
  // 담당자/메모/로그 참조는 nullable → 자동 null 처리됨
  await prisma.user.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
