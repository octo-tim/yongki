import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
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

async function chunkInsert<T>(rows: T[], size: number, fn: (batch: T[]) => Promise<any>) {
  for (let i = 0; i < rows.length; i += size) {
    await fn(rows.slice(i, i + size));
  }
}

async function main() {
  console.log("🌱 시드 시작 (batch 방식)");
  const data = seedData as Seed[];

  // 1. 사용자 (관리자·기본 직원 보존)
  const adminPw = await bcrypt.hash("2345", 10);
  const staffPw = await bcrypt.hash("staff1234", 10);
  const admin = await prisma.user.upsert({
    where: { email: "관리자" },
    update: { password: adminPw, name: "관리자", role: "ADMIN" },
    create: { email: "관리자", name: "관리자", password: adminPw, role: "ADMIN" },
  });
  await prisma.user.upsert({
    where: { email: "staff@example.com" },
    update: {},
    create: { email: "staff@example.com", name: "이수림", password: staffPw, role: "STAFF" },
  });

  // 2. 기존 데이터 초기화 (관리자·기본 직원은 유지)
  await prisma.project.deleteMany();
  await prisma.client.deleteMany();
  await prisma.factory.deleteMany();
  await prisma.user.deleteMany({ where: { role: "STAFF", email: { not: "staff@example.com" } } });

  // 3. 업체 / 공장 / 담당자 — 클라이언트에서 ID 생성 후 일괄 insert
  const clientNames = [...new Set(data.map((p) => p.clientName).filter(Boolean))] as string[];
  const factoryNames = [...new Set(data.map((p) => p.factoryName).filter(Boolean))] as string[];
  const managerNames = [...new Set(data.map((p) => p.managerName).filter(Boolean))] as string[];

  const clientMap = new Map<string, string>();
  const clientRows = clientNames.map((name) => {
    const id = randomUUID(); clientMap.set(name, id); return { id, name };
  });
  await chunkInsert(clientRows, 500, (b) => prisma.client.createMany({ data: b }));

  const factoryMap = new Map<string, string>();
  const factoryRows = factoryNames.map((name) => {
    const id = randomUUID(); factoryMap.set(name, id);
    return { id, name, region: name.trim().split(/\s+/)[0] };
  });
  await chunkInsert(factoryRows, 500, (b) => prisma.factory.createMany({ data: b }));

  // 담당자: 기본 직원(이수림=staff@example.com) 재사용 + 나머지는 신규 유저
  const managerMap = new Map<string, string>();
  const baseStaff = await prisma.user.findFirst({ where: { email: "staff@example.com" } });
  if (baseStaff) managerMap.set("이수림", baseStaff.id);
  const newManagerRows: { id: string; email: string; name: string; password: string; role: "STAFF" }[] = [];
  for (const name of managerNames) {
    if (managerMap.has(name)) continue;
    const id = randomUUID();
    managerMap.set(name, id);
    newManagerRows.push({ id, email: `${Buffer.from(name).toString("hex").slice(0, 12)}@example.com`, name, password: staffPw, role: "STAFF" });
  }
  if (newManagerRows.length) await prisma.user.createMany({ data: newManagerRows });

  // 4. 프로젝트 — ID 생성 후 일괄 insert
  const projectRows: any[] = [];
  const stepRows: { projectId: string; type: any; name: string; order: number }[] = [];
  const logRows: { projectId: string; actorId: string; action: string; message: string }[] = [];

  for (const p of data) {
    const id = randomUUID();
    const dates = {
      manualHold: p.sheetStatus === "ON_HOLD",
      expectedCompletionDate: d(p.expectedCompletionDate),
      productionCompleteDate: d(p.productionCompleteDate),
      shipOutDate: d(p.shipOutDate),
      koreaArrivalDate: d(p.koreaArrivalDate),
      customerDeliveryDate: d(p.customerDeliveryDate),
    };
    const status = computeStatus(dates);
    projectRows.push({
      id,
      productName: p.productName,
      orderNo: p.orderNo,
      orderDate: d(p.orderDate),
      quantity: p.quantity,
      note: p.note,
      clientId: p.clientName ? clientMap.get(p.clientName) ?? null : null,
      factoryId: p.factoryName ? factoryMap.get(p.factoryName) ?? null : null,
      managerId: p.managerName ? managerMap.get(p.managerName) ?? null : null,
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
    });
    for (const s of defaultSteps()) stepRows.push({ projectId: id, ...s });
    logRows.push({ projectId: id, actorId: admin.id, action: "CREATE", message: "시드 데이터 등록" });
  }

  await chunkInsert(projectRows, 300, (b) => prisma.project.createMany({ data: b }));
  await chunkInsert(stepRows, 1000, (b) => prisma.projectStep.createMany({ data: b }));
  await chunkInsert(logRows, 500, (b) => prisma.projectLog.createMany({ data: b }));

  const total = await prisma.project.count();
  console.log(`✅ 완료: 업체 ${clientMap.size} / 공장 ${factoryMap.size} / 담당자 ${managerMap.size} / 프로젝트 ${total} (단계 ${stepRows.length})`);
}

main()
  .catch((e) => { console.error("❌ 시드 실패:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
