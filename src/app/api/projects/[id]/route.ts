import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeStatus } from "@/lib/status";

const toDate = (v: any) => (v ? new Date(v) : null);

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const b = await req.json();
  const prev = await prisma.project.findUnique({ where: { id: params.id } });
  if (!prev) return NextResponse.json({ error: "not found" }, { status: 404 });

  const data = {
    productName: b.productName ?? prev.productName,
    orderNo: b.orderNo ?? null,
    orderDate: toDate(b.orderDate),
    quantity: b.quantity ?? null,
    deposit: b.deposit ?? null,
    balance: b.balance ?? null,
    note: b.note ?? null,
    productPhoto: b.productPhoto ?? null,
    clientId: b.clientId || null,
    factoryId: b.factoryId || null,
    managerId: b.managerId || null,
    manualHold: !!b.manualHold,
    factoryOrderDate: toDate(b.factoryOrderDate),
    expectedCompletionDate: toDate(b.expectedCompletionDate),
    productionCompleteDate: toDate(b.productionCompleteDate),
    warehouseInDate: toDate(b.warehouseInDate),
    inspectionDate: toDate(b.inspectionDate),
    shipOutDate: toDate(b.shipOutDate),
    koreaArrivalDate: toDate(b.koreaArrivalDate),
    customerDeliveryDate: toDate(b.customerDeliveryDate),
  };
  const status = computeStatus(data);

  const project = await prisma.project.update({ where: { id: params.id }, data: { ...data, status } });

  const logs: any[] = [{ projectId: params.id, actorId: (session.user as any).id, action: "UPDATE", message: "프로젝트 수정" }];
  if (status !== prev.status) logs.push({ projectId: params.id, actorId: (session.user as any).id, action: "STATUS_CHANGE", message: `상태 변경: ${prev.status} → ${status}` });
  await prisma.projectLog.createMany({ data: logs });

  return NextResponse.json(project);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  await prisma.project.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
