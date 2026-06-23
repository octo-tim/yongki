import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const b = await req.json();
  const f = await prisma.factory.update({ where: { id: params.id }, data: { name: b.name, region: b.region || null, category: b.category || null, contactType: b.contactType || null, contact: b.contact || null, position: b.position || null, phone: b.phone || null, wechat: b.wechat || null, email: b.email || null, address: b.address || null, account: b.account || null, paymentTerms: b.paymentTerms || null, memo: b.memo || null } });
  return NextResponse.json(f);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const count = await prisma.project.count({ where: { factoryId: params.id } });
  if (count > 0) return NextResponse.json({ error: `연결된 프로젝트 ${count}건이 있어 삭제할 수 없습니다.` }, { status: 400 });
  await prisma.factory.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
