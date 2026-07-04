import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { quoteTotals, type QuoteItem } from "@/lib/company";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role === "CLIENT") return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const b = await req.json();

  // 단순 상태 변경
  if (b.status && !b.edit) {
    const r = await prisma.proposal.update({ where: { id: params.id }, data: { status: b.status } });
    return NextResponse.json({ ok: true, id: r.id });
  }

  const cur = await prisma.proposal.findUnique({ where: { id: params.id } });
  if (!cur) return NextResponse.json({ error: "문서 없음" }, { status: 404 });

  // 현재 상태를 리비전으로 스냅샷 (이 버전에서 발행된 인보이스가 있으면 연결 보존)
  const invForThis = await prisma.proposal.findFirst({ where: { sourceId: params.id, docType: "INVOICE" } as any, select: { id: true } });
  await prisma.proposalRevision.create({
    data: {
      proposalId: cur.id, revisionNo: (cur as any).revisionNo ?? 1,
      title: cur.title, productName: cur.productName, amount: cur.amount as any,
      currency: cur.currency, depositPct: (cur as any).depositPct ?? 30, vatApplied: cur.vatApplied ?? true,
      items: (cur.items as any) ?? undefined, note: cur.note,
      editedById: (session.user as any).id, editedByName: session.user?.name ?? null,
      invoiceId: invForThis?.id ?? null,
    } as any,
  });

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
      depositPct: e.depositPct != null ? Math.min(100, Math.max(0, Number(e.depositPct) || 30)) : ((cur as any).depositPct ?? 30),
      vatApplied,
      items: (e.items as any) ?? (cur.items as any) ?? undefined,
      amount: items.length ? (t.total as any) : (cur.amount as any),
      note: e.note ?? cur.note,
      clientId: "clientId" in e ? (e.clientId || null) : cur.clientId,
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
