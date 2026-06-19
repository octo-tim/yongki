import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session) return { error: "unauthorized", status: 401 } as const;
  if ((session.user as any).role !== "ADMIN") return { error: "forbidden", status: 403 } as const;
  return { session } as const;
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const b = await req.json();
  const type = b.type === "SHIPPING" ? "SHIPPING" : "PRODUCTION";
  const name = (b.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "단계명은 필수입니다." }, { status: 400 });
  const last = await prisma.stepTemplate.findFirst({ where: { type: type as any }, orderBy: { order: "desc" } });
  const order = (last?.order ?? -1) + 1;
  const t = await prisma.stepTemplate.create({ data: { type: type as any, name, order, active: true } });
  return NextResponse.json(t);
}
