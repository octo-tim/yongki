import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { quoteTotals, type QuoteItem } from "@/lib/company";

// 제안서 → 인보이스 발행 (데이터 복사, 이중 입력 방지, 버전 기록)
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role === "CLIENT") return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const src = await prisma.proposal.findUnique({ where: { id: params.id } });
  if (!src) return NextResponse.json({ error: "제안서 없음" }, { status: 404 });
  if (((src as any).docType ?? "PROPOSAL") !== "PROPOSAL") return NextResponse.json({ error: "제안서에서만 인보이스를 발행할 수 있습니다" }, { status: 400 });

  const existing = await prisma.proposal.findFirst({ where: { sourceId: params.id, docType: "INVOICE" } as any, select: { id: true } });
  if (existing) return NextResponse.json({ id: existing.id, existed: true });

  const b = await req.json().catch(() => ({}));
  const depositPct = Math.min(100, Math.max(0, Number(b.depositPct ?? (src as any).depositPct ?? 30) || 30));
  const items = (Array.isArray(src.items) ? src.items : []) as unknown as QuoteItem[];
  const t = quoteTotals(items, true);
  const srcRev = (src as any).revisionNo ?? 1;

  const inv = await prisma.proposal.create({
    data: {
      title: src.title + ` (v${srcRev} 기준)`,
      docType: "INVOICE",
      sourceId: src.id,
      depositPct,
      clientId: src.clientId,
      productName: src.productName,
      currency: src.currency ?? "KRW",
      items: (src.items as any) ?? undefined,
      vatApplied: true,
      amount: t.total,
      sentDate: new Date(),
      note: src.note,
      status: "발송완료",
      creatorId: (session.user as any).id,
    } as any,
  });

  await prisma.proposal.update({ where: { id: src.id }, data: { status: "수주" } });

  return NextResponse.json({ id: inv.id });
}
