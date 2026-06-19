import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildProjectsWorkbook } from "@/lib/excel";
import { ALL_STATUSES } from "@/lib/status";
import { Prisma, type ProjectStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const status = req.nextUrl.searchParams.get("status") as ProjectStatus | null;
  const q = req.nextUrl.searchParams.get("q")?.trim();

  const where: Prisma.ProjectWhereInput = {};
  if (status && ALL_STATUSES.includes(status)) where.status = status;
  if (q) {
    where.OR = [
      { productName: { contains: q, mode: "insensitive" } },
      { orderNo: { contains: q, mode: "insensitive" } },
    ];
  }

  const list = await prisma.project.findMany({
    where, orderBy: { orderDate: "desc" },
    include: { client: true, factory: true, manager: true },
  });

  const rows = list.map((p) => ({
    orderDate: p.orderDate, orderNo: p.orderNo, productName: p.productName,
    quantity: p.quantity, deposit: p.deposit, balance: p.balance, status: p.status,
    clientName: p.client?.name, factoryName: p.factory?.name, managerName: p.manager?.name,
    factoryOrderDate: p.factoryOrderDate, expectedCompletionDate: p.expectedCompletionDate,
    productionCompleteDate: p.productionCompleteDate, warehouseInDate: p.warehouseInDate,
    inspectionDate: p.inspectionDate, shipOutDate: p.shipOutDate,
    koreaArrivalDate: p.koreaArrivalDate, customerDeliveryDate: p.customerDeliveryDate, note: p.note,
  }));

  const buf = await buildProjectsWorkbook(rows);
  const filename = `projects_${new Date().toISOString().slice(0, 10)}.xlsx`;

  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
