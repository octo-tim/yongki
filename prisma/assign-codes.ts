/**
 * 공장·업체에 번호(code) 부여. 엑셀(정리) 기준 발주건수 많은 순 → 동일하면 이름순으로 1..N.
 * 실행:  DATABASE_URL="<공개DB_URL>" npx tsx prisma/assign-codes.ts
 */
import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";
const prisma = new PrismaClient();

type Row = { client: string | null; factory: string | null };
const t = (s: string | null) => (s ? s.trim() : "");

function ordered(rows: Row[], key: "client" | "factory") {
  const c = new Map<string, number>();
  for (const r of rows) { const v = t(r[key]); if (v) c.set(v, (c.get(v) ?? 0) + 1); }
  return Array.from(c.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "zh")).map(([n]) => n);
}

async function assign(kind: "client" | "factory", names: string[]) {
  const model: any = kind === "client" ? prisma.client : prisma.factory;
  // 충돌 방지: 먼저 모든 code 비움
  await model.updateMany({ data: { code: null } });
  let n = 0;
  for (const name of names) { const res = await model.updateMany({ where: { name }, data: { code: ++n } }); if (res.count === 0) n--; }
  // 엑셀에 없던 항목(코드 없는 것)은 이어서 부여
  const rest: { id: string; name: string }[] = await model.findMany({ where: { code: null }, orderBy: { name: "asc" }, select: { id: true, name: true } });
  for (const r of rest) await model.update({ where: { id: r.id }, data: { code: ++n } });
  console.log(`${kind}: 번호 부여 1..${n}`);
}

async function main() {
  const rows: Row[] = JSON.parse(fs.readFileSync(path.join(__dirname, "import-data-v2.json"), "utf-8"));
  await assign("factory", ordered(rows, "factory"));
  await assign("client", ordered(rows, "client"));
  console.log("완료");
}

main().then(() => prisma.$disconnect()).catch((e) => { console.error("오류:", e); prisma.$disconnect(); process.exit(1); });
