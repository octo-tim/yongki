import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import path from "path";

const prisma = new PrismaClient();
const norm = (s: any) => String(s ?? "").replace(/\s+/g, " ").trim();
const dstr = (v: any) => (v ? new Date(v).toISOString().slice(0, 10) : "");

type Entry = { productName: string; orderDate: string | null; orderNo: string | null; path: string };

async function main() {
  const entries: Entry[] = JSON.parse(readFileSync(path.join(__dirname, "photo-apply.json"), "utf-8"));
  const projects = await prisma.project.findMany({ select: { id: true, productName: true, orderDate: true, orderNo: true } });

  // 인덱스: (상품명+일자), 상품명
  const byPnd = new Map<string, string[]>();
  const byPn = new Map<string, string[]>();
  for (const p of projects) {
    const k = `${norm(p.productName)}||${dstr(p.orderDate)}`;
    (byPnd.get(k) ?? byPnd.set(k, []).get(k)!).push(p.id);
    const k2 = norm(p.productName);
    (byPn.get(k2) ?? byPn.set(k2, []).get(k2)!).push(p.id);
  }

  const used = new Set<string>();
  let set = 0, miss = 0;
  for (const e of entries) {
    const cands =
      (byPnd.get(`${norm(e.productName)}||${e.orderDate ?? ""}`) ?? byPn.get(norm(e.productName)) ?? [])
        .filter((id) => !used.has(id));
    if (cands.length === 0) { miss++; console.log("  미매칭:", e.productName, e.orderDate); continue; }
    const id = cands[0]; used.add(id);
    await prisma.project.update({ where: { id }, data: { productPhoto: e.path } });
    set++;
  }
  console.log(`✅ 제품사진 반영: ${set}건 / 미매칭 ${miss}건`);
}
main().catch((e) => { console.error("❌ 실패:", e); process.exit(1); }).finally(() => prisma.$disconnect());
