import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { STEP_TO_PROJECT_DATE } from "../src/lib/steps";
import seedData from "./seed-data.json";

const prisma = new PrismaClient();

type SeedStep = { type: "PRODUCTION" | "SHIPPING"; group: string; name: string; order: number; date: string | null; staff: string | null };
type Seed = {
  orderDate: string | null; orderNo: string | null; productName: string; quantity: number | null;
  clientName: string | null; factoryName: string | null; managerName: string | null;
  note: string | null; sheetStatus: string; steps: SeedStep[];
};

const d = (v: string | null) => (v ? new Date(v) : null);

async function chunkInsert<T>(rows: T[], size: number, fn: (batch: T[]) => Promise<any>) {
  for (let i = 0; i < rows.length; i += size) await fn(rows.slice(i, i + size));
}

async function main() {
  console.log("🌱 시드 시작 (단계별 일자+직원)");
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

  // 3. 업체 / 공장 / 담당자
  const clientNames = [...new Set(data.map((p) => p.clientName).filter(Boolean))] as string[];
  const factoryNames = [...new Set(data.map((p) => p.factoryName).filter(Boolean))] as string[];
  const managerNames = [...new Set(data.map((p) => p.managerName).filter(Boolean))] as string[];

  const clientMap = new Map<string, string>();
  const clientRows = clientNames.map((name) => { const id = randomUUID(); clientMap.set(name, id); return { id, name }; });
  await chunkInsert(clientRows, 500, (b) => prisma.client.createMany({ data: b }));

  const factoryMap = new Map<string, string>();
  const factoryRows = factoryNames.map((name) => {
    const id = randomUUID(); factoryMap.set(name, id);
    return { id, name, region: name.trim().split(/\s+/)[0] };
  });
  await chunkInsert(factoryRows, 500, (b) => prisma.factory.createMany({ data: b }));

  const managerMap = new Map<string, string>();
  const baseStaff = await prisma.user.findFirst({ where: { email: "staff@example.com" } });
  if (baseStaff) managerMap.set("이수림", baseStaff.id);
  const newManagerRows: { id: string; email: string; name: string; password: string; role: "STAFF" }[] = [];
  for (const name of managerNames) {
    if (managerMap.has(name)) continue;
    const id = randomUUID(); managerMap.set(name, id);
    newManagerRows.push({ id, email: `${Buffer.from(name).toString("hex").slice(0, 12)}@example.com`, name, password: staffPw, role: "STAFF" });
  }
  if (newManagerRows.length) await prisma.user.createMany({ data: newManagerRows });

  // 4. 프로젝트 + 단계
  const projectRows: any[] = [];
  const stepRows: any[] = [];
  const noteRows: any[] = [];
  const logRows: any[] = [];

  for (const p of data) {
    const id = randomUUID();
    // 단계 → 프로젝트 날짜 컬럼 동기화 (내보내기 호환)
    const pdates: Record<string, Date | null> = {
      factoryOrderDate: null, expectedCompletionDate: null, productionCompleteDate: null,
      warehouseInDate: null, inspectionDate: null, shipOutDate: null, koreaArrivalDate: null, customerDeliveryDate: null,
    };
    for (const s of p.steps) {
      const col = STEP_TO_PROJECT_DATE[s.name];
      if (col && s.date) pdates[col] = d(s.date);
      stepRows.push({
        projectId: id, type: s.type, group: s.group, name: s.name, order: s.order,
        done: !!(s.date || s.staff), doneAt: d(s.date), staff: s.staff || null,
      });
    }
    projectRows.push({
      id, productName: p.productName, orderNo: p.orderNo, orderDate: d(p.orderDate),
      quantity: p.quantity, note: p.note,
      clientId: p.clientName ? clientMap.get(p.clientName) ?? null : null,
      factoryId: p.factoryName ? factoryMap.get(p.factoryName) ?? null : null,
      managerId: p.managerName ? managerMap.get(p.managerName) ?? null : null,
      manualHold: p.sheetStatus === "ON_HOLD",
      ...pdates,
      status: p.sheetStatus, // 상태 수동: 시트값 그대로
    });
    logRows.push({ projectId: id, actorId: admin.id, action: "CREATE", message: "시드 데이터 등록" });
    if (p.note) noteRows.push({ projectId: id, authorId: admin.id, content: p.note, createdAt: d(p.orderDate) ?? new Date() });
  }

  await chunkInsert(projectRows, 300, (b) => prisma.project.createMany({ data: b }));
  await chunkInsert(stepRows, 1000, (b) => prisma.projectStep.createMany({ data: b }));
  await chunkInsert(noteRows, 500, (b) => prisma.projectNote.createMany({ data: b }));
  await chunkInsert(logRows, 500, (b) => prisma.projectLog.createMany({ data: b }));

  const total = await prisma.project.count();
  const stepCnt = await prisma.projectStep.count();
  console.log(`✅ 완료: 업체 ${clientMap.size} / 공장 ${factoryMap.size} / 담당자 ${managerMap.size} / 프로젝트 ${total} / 단계 ${stepCnt}`);
}

main().catch((e) => { console.error("❌ 시드 실패:", e); process.exit(1); }).finally(() => prisma.$disconnect());
