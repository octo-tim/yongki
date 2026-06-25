/**
 * 공장명·업체명을 첨부 엑셀(Sheet1) 기준으로 교체.
 *   - 엑셀에 없는 기존 공장/업체는 삭제(참조는 자동 null)
 *   - 엑셀에 있고 기존에도 있는 이름은 그대로 유지(연결·상세정보 보존)
 *   - 엑셀에만 있는 이름은 새로 생성
 *   - 모든 프로젝트(및 제품)를 엑셀 행(주문번호+상품명) 기준으로 공장/업체에 재연결
 * 유지: 사용자·프로젝트·단계·업무 등 (이름 매칭되는 공장/업체의 업무·회의 연결도 유지)
 * 실행:  DATABASE_URL="<공개DB_URL>" npx tsx prisma/replace-entity-names.ts
 */
import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";
const prisma = new PrismaClient();

type Row = { orderNo: string | null; productName: string; client: string | null; factory: string | null };
const keyOf = (orderNo: string | null, productName: string) => `${orderNo ?? ""}||${productName}`;

async function reconcile(kind: "client" | "factory", excelNames: Set<string>) {
  const model: any = kind === "client" ? prisma.client : prisma.factory;
  const existing: { id: string; name: string }[] = await model.findMany({ select: { id: true, name: true } });
  const existingNames = new Set(existing.map((e) => e.name));
  // 엑셀에 없는 기존 항목 삭제 (참조는 optional이라 자동 null)
  let removed = 0;
  for (const e of existing) if (!excelNames.has(e.name)) { await model.delete({ where: { id: e.id } }); removed++; }
  // 엑셀에만 있는 이름 생성
  let created = 0;
  for (const n of excelNames) if (!existingNames.has(n)) { await model.create({ data: { name: n } }); created++; }
  const map = new Map<string, string>((await model.findMany({ select: { id: true, name: true } })).map((e: any) => [e.name, e.id]));
  console.log(`${kind}: 삭제 ${removed} · 생성 ${created} · 최종 ${map.size}`);
  return map;
}

async function main() {
  const rows: Row[] = JSON.parse(fs.readFileSync(path.join(__dirname, "import-data.json"), "utf-8"));
  const byKey = new Map<string, { client: string | null; factory: string | null }>();
  for (const r of rows) if (!byKey.has(keyOf(r.orderNo, r.productName))) byKey.set(keyOf(r.orderNo, r.productName), { client: r.client, factory: r.factory });
  const E_C = new Set(rows.map((r) => r.client).filter(Boolean) as string[]);
  const E_F = new Set(rows.map((r) => r.factory).filter(Boolean) as string[]);
  console.log(`엑셀 고유 업체 ${E_C.size} · 공장 ${E_F.size}`);

  const clientMap = await reconcile("client", E_C);
  const factoryMap = await reconcile("factory", E_F);

  // 프로젝트(+제품) 재연결
  const projects = await prisma.project.findMany({ select: { id: true, orderNo: true, productName: true } });
  let linked = 0; const unmatched: string[] = [];
  for (const p of projects) {
    const m = byKey.get(keyOf(p.orderNo, p.productName));
    if (!m) { unmatched.push(p.productName); continue; }
    const cId = m.client ? clientMap.get(m.client) ?? null : null;
    const fId = m.factory ? factoryMap.get(m.factory) ?? null : null;
    await prisma.project.update({ where: { id: p.id }, data: { clientId: cId, factoryId: fId } });
    await prisma.product.updateMany({ where: { projectId: p.id }, data: { clientId: cId, factoryId: fId } });
    linked++;
  }
  console.log(`프로젝트 재연결 ${linked}/${projects.length}`);
  if (unmatched.length) console.log(`주의: 엑셀 행 매칭 실패 ${unmatched.length}건 (공장/업체 미연결) 예: ${unmatched.slice(0, 8).join(", ")}`);
}

main().then(() => prisma.$disconnect()).catch((e) => { console.error(e); prisma.$disconnect(); process.exit(1); });
