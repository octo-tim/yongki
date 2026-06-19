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

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const users = await prisma.user.findMany({
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  });
  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const b = await req.json();
  const email = (b.email ?? "").trim();
  const name = (b.name ?? "").trim();
  const password = b.password ?? "";
  const role = b.role === "ADMIN" ? "ADMIN" : "STAFF";
  if (!email || !name || !password) {
    return NextResponse.json({ error: "아이디·이름·비밀번호는 필수입니다." }, { status: 400 });
  }
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return NextResponse.json({ error: "이미 존재하는 아이디입니다." }, { status: 400 });
  const hash = await bcrypt.hash(password, 10);
  const u = await prisma.user.create({ data: { email, name, password: hash, role } });
  return NextResponse.json({ id: u.id, email: u.email, name: u.name, role: u.role });
}
