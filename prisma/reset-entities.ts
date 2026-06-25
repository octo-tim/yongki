/**
 * 공장·업체를 전부 삭제하고 첨부 엑셀(Sheet1) 명으로 재생성 + 프로젝트/제품 재연결.
 *   잔여/중복 공장·업체를 확실히 제거 (이름 trim 기준). 현재/최종 건수 출력.
 * 실행:  DATABASE_URL="<공개DB_URL>" npx tsx prisma/reset-entities.ts
 */
import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";
const prisma = new PrismaClient();

type Row = { orderNo: string | null; productName: string; client: string | null; factory: string | null };
const norm = (s: string) => s.trim();
const keyOf = (o: string | null, n: string) => `${o ?? ""}||${n}`;

async function main() {
  const rows: Row[] = JSON.parse(fs.readFileSync(path.join(__dirname, "import-data.json"), "utf-8"));

  const curF = await prisma.factory.count();
  const curC = await prisma.client.count();
  console.log(`현재 DB: 공장 ${curF} · 업체 ${curC}`);

  const E_C = new Set<string>(); const E_F = new Set<string>();
  const byKey = new Map<string, { client: string | null; factory: string | null }>();
  for (const r of rows) {
    const c = r.client ? norm(r.client) : null;
    const f = r.factory ? norm(r.factory) : null;
    if (c) E_C.add(c); if (f) E_F.add(f);
    const k = keyOf(r.orderNo, r.productName);
    if (!byKey.has(k)) byKey.set(k, { client: c, factory: f });
  }
  console.log(`엑셀 고유: 업체 ${E_C.size} · 공장 ${E_F.size}`);

  // 참조 먼저 해제 (FK 충돌 방지)
  await prisma.product.updateMany({ data: { clientId: null, factoryId: null } });
  await prisma.project.updateMany({ data: { clientId: null, factoryId: null } });
  await prisma.workRequest.updateMany({ data: { clientId: null, factoryId: null } });
  await prisma.meeting.updateMany({ data: { clientId: null, factoryId: null } });
  try { await prisma.progressPhoto.updateMany({ data: { clientId: null, factoryId: null } }); } catch {}

  // 전체 삭제 후 재생성
  const delF = await prisma.factory.deleteMany({});
  const delC = await prisma.client.deleteMany({});
  console.log(`삭제: 공장 ${delF.count} · 업체 ${delC.count}`);

  const clientMap = new Map<string, string>();
  const factoryMap = new Map<string, string>();
  for (const n of E_C) { const c = await prisma.client.create({ data: { name: n } }); clientMap.set(n, c.id); }
  for (const n of E_F) { const f = await prisma.factory.create({ data: { name: n } }); factoryMap.set(n, f.id); }
  console.log(`재생성: 업체 ${clientMap.size} · 공장 ${factoryMap.size}`);

  // 프로젝트·제품 재연결
  const projects = await prisma.project.findMany({ select: { id: true, orderNo: true, productName: true } });
  let linked = 0; const un: string[] = [];
  for (const p of projects) {
    const m = byKey.get(keyOf(p.orderNo, p.productName));
    if (!m) { un.push(p.productName); continue; }
    const cId = m.client ? clientMap.get(m.client) ?? null : null;
    const fId = m.factory ? factoryMap.get(m.factory) ?? null : null;
    await prisma.project.update({ where: { id: p.id }, data: { clientId: cId, factoryId: fId } });
    await prisma.product.updateMany({ where: { projectId: p.id }, data: { clientId: cId, factoryId: fId } });
    linked++;
  }
  const finF = await prisma.factory.count();
  const finC = await prisma.client.count();
  console.log(`프로젝트 재연결 ${linked}/${projects.length}`);
  console.log(`완료 — 최종 공장 ${finF} · 업체 ${finC}`);
  if (un.length) console.log(`주의: 매칭 실패 ${un.length}건 (미연결) 예: ${un.slice(0, 8).join(", ")}`);
}

main().then(() => prisma.$disconnect()).catch((e) => { console.error("오류:", e); prisma.$disconnect(); process.exit(1); });
