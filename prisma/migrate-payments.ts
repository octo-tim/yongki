/**
 * 결재관리 재구성:
 *  - 기존 Payment(구 수금내역) 전부 삭제
 *  - 각 프로젝트의 기존 계약금(deposit)/잔금(balance)을 '판매(SALES)' 결재 슬롯으로 이관
 *    (구매(PURCHASE) 슬롯은 입력 시 생성)
 * 실행:  DATABASE_URL="<공개DB_URL>" npx tsx prisma/migrate-payments.ts
 */
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const del = await prisma.payment.deleteMany({});
  console.log(`기존 Payment 삭제: ${del.count}건`);

  const projects = await prisma.project.findMany({
    select: { id: true, deposit: true, balance: true, depositMethod: true, balanceMethod: true },
  });

  const data: any[] = [];
  for (const p of projects) {
    if (p.deposit != null) data.push({ projectId: p.id, side: "SALES", type: "DEPOSIT", amount: p.deposit, method: p.depositMethod ?? null });
    if (p.balance != null) data.push({ projectId: p.id, side: "SALES", type: "BALANCE", amount: p.balance, method: p.balanceMethod ?? null });
  }
  if (data.length) await prisma.payment.createMany({ data });
  console.log(`판매 결재 슬롯 생성: ${data.length}건 / 프로젝트 ${projects.length}건`);
}

main().then(() => prisma.$disconnect()).catch((e) => { console.error(e); prisma.$disconnect(); process.exit(1); });
