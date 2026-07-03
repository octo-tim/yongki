import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role === "CLIENT") return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const b = await req.json();
  const r = await prisma.clientPortalRequest.update({ where: { id: params.id }, data: { status: b.status } });
  return NextResponse.json(r);
}
