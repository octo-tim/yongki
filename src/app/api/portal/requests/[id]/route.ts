import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role === "CLIENT") return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const b = await req.json();
  const data: any = {};
  if ("status" in b) data.status = b.status;
  if (b.fileChecked === true) {
    data.fileCheckedAt = new Date();
    data.fileCheckedBy = session.user?.name ?? null;
  }
  const r = await prisma.clientPortalRequest.update({ where: { id: params.id }, data });
  return NextResponse.json({ ok: true, id: r.id });
}
