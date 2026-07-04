import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role === "CLIENT") return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const revs = await prisma.proposalRevision.findMany({
    where: { proposalId: params.id },
    orderBy: { revisionNo: "desc" },
    select: { id: true, revisionNo: true, title: true, amount: true, currency: true, editedByName: true, invoiceId: true, createdAt: true },
  });
  return NextResponse.json(revs);
}
