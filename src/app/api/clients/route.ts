import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const b = await req.json();
  if (!b.name?.trim()) return NextResponse.json({ error: "업체명 필수" }, { status: 400 });
  const c = await prisma.client.create({ data: { name: b.name, contact: b.contact || null, phone: b.phone || null, region: b.region || null, account: b.account || null, memo: b.memo || null } });
  return NextResponse.json(c);
}
