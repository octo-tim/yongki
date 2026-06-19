import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getNewProjectSteps } from "@/lib/step-templates";

const toDate = (v: any) => (v ? new Date(v) : null);

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const b = await req.json();
  if (!b.productName) return NextResponse.json({ error: "상품명 필수" }, { status: 400 });

  const status = b.status || "IN_PROGRESS"; // 상태 수동 지정 (기본 진행중)
  const data = {
    productName: b.productName,
    orderNo: b.orderNo || null,
    orderDate: toDate(b.orderDate),
    quantity: b.quantity ?? null,
    deposit: b.deposit ?? null,
    balance: b.balance ?? null,
    note: b.note || null,
    productPhoto: b.productPhoto || null,
    clientId: b.clientId || null,
    factoryId: b.factoryId || null,
    managerId: b.managerId || null,
    manualHold: status === "ON_HOLD",
  };

  const project = await prisma.project.create({
    data: {
      ...data, status,
      steps: { create: await getNewProjectSteps() },
      logs: { create: { actorId: (session.user as any).id, action: "CREATE", message: "프로젝트 등록" } },
    },
  });
  return NextResponse.json(project);
}
