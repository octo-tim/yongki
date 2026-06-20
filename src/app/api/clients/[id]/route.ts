import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const b = await req.json();
  const c = await prisma.client.update({ where: { id: params.id }, data: { name: b.name, representative: b.representative || null, contact: b.contact || null, position: b.position || null, phone: b.phone || null, email: b.email || null, bizNo: b.bizNo || null, region: b.region || null, address: b.address || null, account: b.account || null, paymentTerms: b.paymentTerms || null, memo: b.memo || null } });
  return NextResponse.json(c);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const count = await prisma.project.count({ where: { clientId: params.id } });
  if (count > 0) return NextResponse.json({ error: `연결된 프로젝트 ${count}건이 있어 삭제할 수 없습니다.` }, { status: 400 });
  await prisma.client.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
