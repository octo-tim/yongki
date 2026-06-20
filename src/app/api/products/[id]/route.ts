import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const num = (v: any) => (v === "" || v == null ? null : Number(v));

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const b = await req.json();
  const data: any = {};
  if ("name" in b) data.name = b.name || "상품";
  if ("code" in b) data.code = b.code || null;
  if ("supplyPrice" in b) data.supplyPrice = num(b.supplyPrice);
  if ("salesPrice" in b) data.salesPrice = num(b.salesPrice);
  if ("quantity" in b) data.quantity = num(b.quantity);
  if ("note" in b) data.note = b.note || null;
  if ("projectId" in b) data.projectId = b.projectId || null;
  if ("factoryId" in b) data.factoryId = b.factoryId || null;
  if ("clientId" in b) data.clientId = b.clientId || null;

  const product = await prisma.product.update({ where: { id: params.id }, data });
  return NextResponse.json(product);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  await prisma.product.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
