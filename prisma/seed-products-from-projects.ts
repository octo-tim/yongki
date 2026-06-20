/**
 * 업로드된 프로젝트 데이터를 품목(Product)으로 반영.
 *  - 각 프로젝트에 연결된 품목이 없으면, 프로젝트명으로 품목 생성
 *    (프로젝트/구매처(공장)/판매처(업체)/수량 연동, 단가는 추후 입력)
 *  - 이미 연결된 품목이 있으면 건너뜀 (중복 방지, 반복 실행 안전)
 * 실행:  DATABASE_URL="<공개DB_URL>" npx tsx prisma/seed-products-from-projects.ts
 */
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const projects = await prisma.project.findMany({
    select: { id: true, productName: true, factoryId: true, clientId: true, quantity: true },
  });

  // 이미 프로젝트에 연결된 품목 id 집합
  const existing = await prisma.product.findMany({ where: { projectId: { not: null } }, select: { projectId: true } });
  const has = new Set(existing.map((e) => e.projectId));

  const data = projects
    .filter((p) => !has.has(p.id))
    .map((p) => ({
      name: p.productName,
      projectId: p.id,
      factoryId: p.factoryId,
      clientId: p.clientId,
      quantity: p.quantity ?? null,
      supplyCurrency: "RMB",
      salesCurrency: "RMB",
    }));

  if (data.length) await prisma.product.createMany({ data });
  console.log(`품목 생성: ${data.length}건 (기존 연결 ${has.size}건 제외 / 총 프로젝트 ${projects.length}건)`);
}

main().then(() => prisma.$disconnect()).catch((e) => { console.error(e); prisma.$disconnect(); process.exit(1); });
