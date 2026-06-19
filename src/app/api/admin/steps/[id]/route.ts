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

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const b = await req.json();
  const data: Record<string, any> = {};
  if (typeof b.name === "string" && b.name.trim()) data.name = b.name.trim();
  if (typeof b.group === "string" && b.group.trim()) data.group = b.group.trim();
  if (typeof b.order === "number") data.order = b.order;
  if (typeof b.active === "boolean") data.active = b.active;
  const t = await prisma.stepTemplate.update({ where: { id: params.id }, data });
  return NextResponse.json(t);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  await prisma.stepTemplate.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
