/**
 * (선택) 기존 공장의 품목(category) 값을 주요품목(mainProducts)으로 이관.
 * 실행:  DATABASE_URL="<공개DB_URL>" npx tsx prisma/factory-main-products.ts
 */
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const list = await prisma.factory.findMany({ select: { id: true, category: true, mainProducts: true } });
  let n = 0;
  for (const f of list) {
    if (!f.mainProducts && f.category) {
      await prisma.factory.update({ where: { id: f.id }, data: { mainProducts: f.category } });
      n++;
    }
  }
  console.log(`품목 → 주요품목 이관: ${n}건`);
}

main().then(() => prisma.$disconnect()).catch((e) => { console.error(e); prisma.$disconnect(); process.exit(1); });
