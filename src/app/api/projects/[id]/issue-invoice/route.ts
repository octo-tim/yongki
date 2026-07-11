import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// 프로젝트에서 계약금/잔금/전체 인보이스 발행
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role === "CLIENT") return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const project = await prisma.project.findUnique({ where: { id: params.id }, select: { id: true, productName: true, clientId: true } });
  if (!project) return NextResponse.json({ error: "프로젝트 없음" }, { status: 404 });

  const b = await req.json();
  const kind = String(b.kind || "FULL"); // DEPOSIT | BALANCE | FULL | SAMPLE
  const kindKo = kind === "DEPOSIT" ? "계약금" : kind === "BALANCE" ? "잔금" : kind === "SAMPLE" ? "샘플" : "전체";
  const amount = Number(b.amount || 0);
  const vatApplied = b.vatApplied !== false;
  const currency = String(b.currency || "KRW");
  const note = String(b.note || "").trim() || null;
  const items = Array.isArray(b.items) ? b.items : [];
  if (!amount && items.length === 0) return NextResponse.json({ error: "금액 또는 항목을 입력하세요" }, { status: 400 });

  // 항목이 있으면 항목합, 없으면 입력 amount 사용
  const supply = items.length
    ? items.reduce((a: number, it: any) => a + (Number(it.qty) || 0) * (Number(it.unitPrice) || 0), 0)
    : amount;
  const total = vatApplied ? Math.round(supply * (items.length ? 1.1 : 1)) : supply;
  // 금액 직접입력(항목 없음) 시에는 입력값을 합계금액으로 그대로 사용
  const finalAmount = items.length ? total : amount;

  const inv = await prisma.proposal.create({
    data: {
      title: `${project.productName}_${kindKo}`,
      docType: "INVOICE",
      invoiceKind: kind,
      projectId: project.id,
      clientId: project.clientId,
      currency,
      items: items.length ? items : undefined,
      vatApplied,
      amount: finalAmount,
      depositPct: kind === "DEPOSIT" ? 100 : kind === "BALANCE" ? 0 : kind === "SAMPLE" ? 0 : 30,
      sentDate: new Date(),
      note,
      status: "발송완료",
      creatorId: (session.user as any).id,
    } as any,
  });
  return NextResponse.json({ id: inv.id });
}
