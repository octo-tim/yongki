import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const num = (v: any) => (v === "" || v == null ? null : Number(v));

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const b = await req.json();
  if (!b.name) return NextResponse.json({ error: "상품명 필수" }, { status: 400 });

  const product = await prisma.product.create({
    data: {
      name: b.name,
      code: b.code || null,
      supplyPrice: num(b.supplyPrice),
      salesPrice: num(b.salesPrice),
      quantity: num(b.quantity),
      note: b.note || null,
      projectId: b.projectId || null,
      factoryId: b.factoryId || null,
      clientId: b.clientId || null,
    },
  });
  return NextResponse.json(product);
}
