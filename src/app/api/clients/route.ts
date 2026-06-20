import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const b = await req.json();
  if (!b.name?.trim()) return NextResponse.json({ error: "업체명 필수" }, { status: 400 });
  const c = await prisma.client.create({ data: { name: b.name, representative: b.representative || null, contact: b.contact || null, position: b.position || null, phone: b.phone || null, email: b.email || null, bizNo: b.bizNo || null, region: b.region || null, address: b.address || null, account: b.account || null, paymentTerms: b.paymentTerms || null, memo: b.memo || null } });
  return NextResponse.json(c);
}
