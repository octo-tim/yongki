import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// 고객이 확인 처리
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const role = (session.user as any).role;

  const f = await prisma.staffFileRequest.findUnique({ where: { id: params.id }, select: { clientId: true } });
  if (!f) return NextResponse.json({ error: "파일 없음" }, { status: 404 });
  if (role === "CLIENT" && f.clientId !== (session.user as any).clientId) return NextResponse.json({ error: "권한 없음" }, { status: 403 });

  const r = await prisma.staffFileRequest.update({
    where: { id: params.id },
    data: { confirmedAt: new Date(), confirmedBy: session.user?.name ?? "고객" },
  });
  return NextResponse.json({ ok: true, confirmedAt: r.confirmedAt });
}
