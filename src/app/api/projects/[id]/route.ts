import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const toDate = (v: any) => (v ? new Date(v) : null);

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const b = await req.json();
  const prev = await prisma.project.findUnique({ where: { id: params.id } });
  if (!prev) return NextResponse.json({ error: "not found" }, { status: 404 });

  const status = b.status || prev.status; // 상태 수동 지정
  const data: any = {};
  if ("productName" in b) data.productName = b.productName ?? prev.productName;
  if ("orderNo" in b) data.orderNo = b.orderNo || null;
  if ("orderDate" in b) data.orderDate = toDate(b.orderDate);
  if ("shipRequestDate" in b) data.shipRequestDate = toDate(b.shipRequestDate);
  if ("quantity" in b) data.quantity = b.quantity ?? null;
  if ("deposit" in b) data.deposit = b.deposit ?? null;
  if ("balance" in b) data.balance = b.balance ?? null;
  if ("depositMethod" in b) data.depositMethod = b.depositMethod || null;
  if ("balanceMethod" in b) data.balanceMethod = b.balanceMethod || null;
  if ("factoryAccount" in b) data.factoryAccount = b.factoryAccount || null;
  if ("importantNote" in b) data.importantNote = b.importantNote || null;
  if ("note" in b) data.note = b.note ?? null;
  if ("productPhoto" in b) data.productPhoto = b.productPhoto ?? null;
  if ("clientId" in b) data.clientId = b.clientId || null;
  if ("factoryId" in b) data.factoryId = b.factoryId || null;
  if ("managerId" in b) data.managerId = b.managerId || null;
  if (b.status) { data.status = status; }
  // 일정/출고 날짜 컬럼(factoryOrderDate 등)은 단계(steps)에서 관리하므로 여기서 덮어쓰지 않음

  const project = await prisma.project.update({ where: { id: params.id }, data });

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
