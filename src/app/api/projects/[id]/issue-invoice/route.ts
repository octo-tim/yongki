import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// 프로젝트에서 계약금/잔금/전체 인보이스 발행
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role === "CLIENT") return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    select: {
      id: true, productName: true, productPhoto: true, quantity: true, clientId: true,
      products: { orderBy: { createdAt: "asc" }, select: { name: true, quantity: true, salesPrice: true, salesCurrency: true, exchangeRate: true, salesVatRate: true } },
    },
  });
  if (!project) return NextResponse.json({ error: "프로젝트 없음" }, { status: 404 });

  const b = await req.json();
  const kind = String(b.kind || "FULL"); // DEPOSIT | INTERIM | BALANCE | FULL | SAMPLE
  const kindKo = kind === "DEPOSIT" ? "계약금" : kind === "INTERIM" ? "중도금" : kind === "BALANCE" ? "잔금" : kind === "SAMPLE" ? "샘플" : "전체";
  const amount = Number(b.amount || 0);
  const vatApplied = b.vatApplied !== false;
  const currency = String(b.currency || "KRW");
  const note = String(b.note || "").trim() || null;
  let items = Array.isArray(b.items) ? b.items : [];
  // 항목 미입력 + 샘플이 아니면, 프로젝트 제품 정보로 자동 항목 생성 (제품사진·수량·판매단가 반영)
  if (items.length === 0 && kind !== "SAMPLE") {
    const prod: any = (project as any).products?.[0] ?? null;
    const qty = prod?.quantity ?? (project as any).quantity ?? 0;
    // 판매단가 RMB 환산 (직원 화면 계산과 동일)
    let unit = 0;
    if (prod) {
      const sp = Number(prod.salesPrice ?? 0);
      unit = prod.salesCurrency === "RMB" ? sp : (Number(prod.exchangeRate ?? 0) > 0 ? sp * Number(prod.exchangeRate) : sp);
    }
    if (qty > 0 && unit > 0) {
      items = [{ name: prod?.name || (project as any).productName || "", spec: "", qty, unitPrice: unit, remark: "", photo: (project as any).productPhoto || undefined }];
    }
  }
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
      depositPct: kind === "DEPOSIT" ? 100 : kind === "BALANCE" ? 0 : kind === "SAMPLE" ? 0 : kind === "INTERIM" ? 0 : 30,
      sentDate: new Date(),
      note,
      status: "발송완료",
      creatorId: (session.user as any).id,
    } as any,
  });
  return NextResponse.json({ id: inv.id });
}
