import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { computeStatus } from "../src/lib/status";
import { defaultSteps } from "../src/lib/steps";
import seedData from "./seed-data.json";

const prisma = new PrismaClient();

type Seed = {
  orderDate: string | null; orderNo: string | null; productName: string; quantity: number | null;
  clientName: string | null; factoryName: string | null; managerName: string | null;
  factoryOrderDate: string | null; expectedCompletionDate: string | null; productionCompleteDate: string | null;
  warehouseInDate: string | null; inspectionDate: string | null; shipOutDate: string | null;
  koreaArrivalDate: string | null; customerDeliveryDate: string | null; note: string | null;
  sheetStatus: string;
};

const d = (v: string | null) => (v ? new Date(v) : null);

async function main() {
  console.log("🌱 시드 시작");

  // 1. 사용자
  const adminPw = await bcrypt.hash("admin1234", 10);
  const staffPw = await bcrypt.hash("staff1234", 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: { email: "admin@example.com", name: "관리자", password: adminPw, role: "ADMIN" },
  });
  await prisma.user.upsert({
    where: { email: "staff@example.com" },
    update: {},
    create: { email: "staff@example.com", name: "이수림", password: staffPw, role: "STAFF" },
  });

  const data = seedData as Seed[];

  // 2. 업체 / 공장 / 담당자 추출
  const clientNames = [...new Set(data.map((p) => p.clientName).filter(Boolean))] as string[];
  const factoryNames = [...new Set(data.map((p) => p.factoryName).filter(Boolean))] as string[];
  const managerNames = [...new Set(data.map((p) => p.managerName).filter(Boolean))] as string[];

  const clientMap = new Map<string, string>();
  for (const name of clientNames) {
    const c = await prisma.client.create({ data: { name } });
    clientMap.set(name, c.id);
  }
  const factoryMap = new Map<string, string>();
  for (const name of factoryNames) {
    const region = name.trim().split(/\s+/)[0];
    const f = await prisma.factory.create({ data: { name, region } });
    factoryMap.set(name, f.id);
  }
  const managerMap = new Map<string, string>();
  managerMap.set("이수림", (await prisma.user.findFirst({ where: { name: "이수림" } }))!.id);
  for (const name of managerNames) {
    if (managerMap.has(name)) continue;
    const u = await prisma.user.create({
      data: { name, email: `${Buffer.from(name).toString("hex").slice(0, 10)}@example.com`, password: staffPw, role: "STAFF" },
    });
    managerMap.set(name, u.id);
  }

  // 3. 프로젝트
  let n = 0;
  for (const p of data) {
    const dates = {
      manualHold: p.sheetStatus === "ON_HOLD",
      expectedCompletionDate: d(p.expectedCompletionDate),
      productionCompleteDate: d(p.productionCompleteDate),
      shipOutDate: d(p.shipOutDate),
      koreaArrivalDate: d(p.koreaArrivalDate),
      customerDeliveryDate: d(p.customerDeliveryDate),
    };
    const status = computeStatus(dates);

    await prisma.project.create({
      data: {
        productName: p.productName,
        orderNo: p.orderNo,
        orderDate: d(p.orderDate),
        quantity: p.quantity,
        note: p.note,
        clientId: p.clientName ? clientMap.get(p.clientName) : null,
        factoryId: p.factoryName ? factoryMap.get(p.factoryName) : null,
        managerId: p.managerName ? managerMap.get(p.managerName) : null,
        manualHold: dates.manualHold,
        factoryOrderDate: d(p.factoryOrderDate),
        expectedCompletionDate: dates.expectedCompletionDate,
        productionCompleteDate: dates.productionCompleteDate,
        warehouseInDate: d(p.warehouseInDate),
        inspectionDate: d(p.inspectionDate),
        shipOutDate: dates.shipOutDate,
        koreaArrivalDate: dates.koreaArrivalDate,
        customerDeliveryDate: dates.customerDeliveryDate,
        status,
        steps: { create: defaultSteps() },
        logs: { create: { actorId: admin.id, action: "CREATE", message: "시드 데이터 등록" } },
      },
    });
    n++;
  }

  console.log(`✅ 완료: 업체 ${clientMap.size} / 공장 ${factoryMap.size} / 담당자 ${managerMap.size} / 프로젝트 ${n}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
