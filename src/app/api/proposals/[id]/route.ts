import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const b = await req.json();
  const data: any = {};
  if ("status" in b) data.status = b.status;
  if ("note" in b) data.note = b.note || null;
  const r = await prisma.proposal.update({ where: { id: params.id }, data });
  return NextResponse.json(r);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  await prisma.proposal.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
