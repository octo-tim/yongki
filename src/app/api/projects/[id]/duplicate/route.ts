import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getNewProjectSteps } from "@/lib/step-templates";

// 프로젝트 복사 (재주문용) — 제품·업체·공장·단가·추가항목은 복제, 진행/결제/문서는 초기화
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const uid = (session.user as any).id as string;

  const src: any = await prisma.project.findUnique({
    where: { id: params.id },
    include: {
      products: { orderBy: { createdAt: "asc" } },
      costItems: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!src) return NextResponse.json({ error: "프로젝트 없음" }, { status: 404 });

  const stepDefs = await getNewProjectSteps();

  const created = await prisma.project.create({
    data: {
      // 복제: 제품·업체·공장·담당자·메모
      productName: `${src.productName} (재주문)`,
      quantity: src.quantity ?? null,
      productPhoto: src.productPhoto ?? null,
      importantNote: src.importantNote ?? null,
      factoryAccount: src.factoryAccount ?? null,
      clientId: src.clientId ?? null,
      factoryId: src.factoryId ?? null,
      managerId: src.managerId ?? null,
      // 초기화: 주문번호·날짜·결제·상태는 새로 시작
      orderNo: null,
      orderDate: new Date(),
      status: "",
      // 제품 정보 복제 (단가·통화·환율·부가세율)
      products: {
        create: (src.products || []).map((p: any) => ({
          name: p.name,
          supplyPrice: p.supplyPrice,
          salesPrice: p.salesPrice,
          supplyCurrency: p.supplyCurrency,
          salesCurrency: p.salesCurrency,
          exchangeRate: p.exchangeRate,
          salesVatRate: p.salesVatRate,
          quantity: p.quantity,
        })),
      },
      // 판매/구매 추가항목 복제
      costItems: {
        create: (src.costItems || []).map((c: any) => ({
          name: c.name, amount: c.amount, side: c.side ?? "PURCHASE",
        })),
      },
      // 진행 단계는 새로 생성 (모두 미완료)
      steps: { create: stepDefs.map((s) => ({ type: s.type, group: s.group, name: s.name, order: s.order })) },
      logs: { create: { actorId: uid, action: "CREATE", message: `프로젝트 복사 등록 (원본: ${src.productName})` } },
    },
  });

  return NextResponse.json({ id: created.id });
}
