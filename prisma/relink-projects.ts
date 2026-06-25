/**
 * 프로젝트·제품을 (이미 엑셀 명으로 존재하는) 공장·업체에 다시 연결.
 *   매칭: 1) 주문번호+상품명  2) 상품명 단독(유일)  3) 주문번호 단독(유일)
 *   실패 건은 원인 진단을 위해 값 출력.
 * 실행:  DATABASE_URL="<공개DB_URL>" npx tsx prisma/relink-projects.ts
 */
import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";
const prisma = new PrismaClient();

type Row = { orderNo: string | null; productName: string; client: string | null; factory: string | null };
const t = (s: string | null | undefined) => (s ?? "").trim();
const keyOf = (o: string | null, n: string) => `${t(o)}||${t(n)}`;

async function main() {
  const rows: Row[] = JSON.parse(fs.readFileSync(path.join(__dirname, "import-data.json"), "utf-8"));

  const byKey = new Map<string, { client: string | null; factory: string | null }>();
  const byName = new Map<string, { client: string | null; factory: string | null }[]>();
  const byOrder = new Map<string, { client: string | null; factory: string | null }[]>();
  for (const r of rows) {
    const v = { client: r.client ? t(r.client) : null, factory: r.factory ? t(r.factory) : null };
    if (!byKey.has(keyOf(r.orderNo, r.productName))) byKey.set(keyOf(r.orderNo, r.productName), v);
    (byName.get(t(r.productName)) ?? byName.set(t(r.productName), []).get(t(r.productName))!).push(v);
    if (r.orderNo) (byOrder.get(t(r.orderNo)) ?? byOrder.set(t(r.orderNo), []).get(t(r.orderNo))!).push(v);
  }

  // 현재 공장·업체 이름→id (trim 기준)
  const clients = await prisma.client.findMany({ select: { id: true, name: true } });
  const factories = await prisma.factory.findMany({ select: { id: true, name: true } });
  const clientMap = new Map(clients.map((c) => [t(c.name), c.id]));
  const factoryMap = new Map(factories.map((f) => [t(f.name), f.id]));
  console.log(`현재 업체 ${clientMap.size} · 공장 ${factoryMap.size}`);

  const projects = await prisma.project.findMany({ select: { id: true, orderNo: true, productName: true } });
  let m1 = 0, m2 = 0, m3 = 0; const un: { o: string | null; n: string }[] = [];

  for (const p of projects) {
    let v = byKey.get(keyOf(p.orderNo, p.productName));
    if (v) m1++;
    if (!v) { const arr = byName.get(t(p.productName)); if (arr && arr.length === 1) { v = arr[0]; m2++; } }
    if (!v && p.orderNo) { const arr = byOrder.get(t(p.orderNo)); if (arr && arr.length === 1) { v = arr[0]; m3++; } }
    if (!v) { un.push({ o: p.orderNo, n: p.productName }); continue; }

    const cId = v.client ? clientMap.get(v.client) ?? null : null;
    const fId = v.factory ? factoryMap.get(v.factory) ?? null : null;
    await prisma.project.update({ where: { id: p.id }, data: { clientId: cId, factoryId: fId } });
    await prisma.product.updateMany({ where: { projectId: p.id }, data: { clientId: cId, factoryId: fId } });
  }

  console.log(`재연결: 정확 ${m1} · 상품명 ${m2} · 주문번호 ${m3} = ${m1 + m2 + m3}/${projects.length}`);
  if (un.length) {
    console.log(`미매칭 ${un.length}건. 예시(주문번호 | 상품명):`);
    un.slice(0, 15).forEach((u) => console.log(`   ${JSON.stringify(u.o)} | ${JSON.stringify(u.n)}`));
    // 엑셀 쪽 키 샘플도 출력 (대조용)
    const sample = Array.from(byKey.keys()).slice(0, 5);
    console.log("엑셀 키 샘플:", sample.map((s) => JSON.stringify(s)).join(" , "));
  }
}

main().then(() => prisma.$disconnect()).catch((e) => { console.error("오류:", e); prisma.$disconnect(); process.exit(1); });
