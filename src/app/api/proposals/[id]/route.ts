import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { quoteTotals, type QuoteItem } from "@/lib/company";

// 상태만 변경(기존) 또는 내용 수정(신규: 버전 스냅샷 기록)
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role === "CLIENT") return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const b = await req.json();

  // 단순 상태 변경
  if (b.status && !b.edit) {
    const r = await prisma.proposal.update({ where: { id: params.id }, data: { status: b.status } });
    return NextResponse.json({ ok: true, id: r.id });
  }

  // 내용 수정 → 현재 상태를 리비전으로 저장 후 갱신
  const cur = await prisma.proposal.findUnique({ where: { id: params.id } });
  if (!cur) return NextResponse.json({ error: "문서 없음" }, { status: 404 });

  // 이 버전에서 이미 발행된 인보이스가 있으면 리비전에 연결해 보존
  const invForThis = await prisma.proposal.findFirst({ where: { sourceId: params.id, docType: "INVOICE" } as any, select: { id: true } });

  await prisma.proposalRevision.create({
    data: {
      proposalId: cur.id,
      revisionNo: (cur as any).revisionNo ?? 1,
      title: cur.title,
      productName: cur.productName,
      amount: cur.amount as any,
      currency: cur.currency,
      depositPct: (cur as any).depositPct ?? 30,
      vatApplied: cur.vatApplied ?? true,
      items: (cur.items as any) ?? undefined,
      note: cur.note,
      editedById: (session.user as any).id,
      editedByName: session.user?.name ?? null,
      invoiceId: invForThis?.id ?? null,
    } as any,
  });

  // 새 값 계산
  const e = b.edit ?? {};
  const items: QuoteItem[] = Array.isArray(e.items) ? e.items : ((cur.items as any) ?? []);
  const vatApplied = typeof e.vatApplied === "boolean" ? e.vatApplied : (cur.vatApplied ?? true);
  const t = quoteTotals(items, vatApplied);

  const updated = await prisma.proposal.update({
    where: { id: params.id },
    data: {
      title: e.title ?? cur.title,
      productName: e.productName ?? (items.length ? items.map((i) => i.name).join(", ").slice(0, 100) : cur.productName),
      currency: e.currency ?? cur.currency,
      depositPct: e.depositPct ?? (cur as any).depositPct ?? 30,
      vatApplied,
      items: (e.items as any) ?? (cur.items as any) ?? undefined,
      amount: items.length ? (t.total as any) : (cur.amount as any),
      note: e.note ?? cur.note,
      sentDate: e.sentDate ? new Date(e.sentDate) : cur.sentDate,
      revisionNo: ((cur as any).revisionNo ?? 1) + 1,
    } as any,
  });
  return NextResponse.json({ ok: true, id: updated.id, revisionNo: (updated as any).revisionNo });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role === "CLIENT") return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  await prisma.proposal.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
