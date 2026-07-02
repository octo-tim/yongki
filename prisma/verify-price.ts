/**
 * 저장된 단가 정밀도 확인. 실행: DATABASE_URL="<공개DB_URL>" npx tsx prisma/verify-price.ts
 */
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  // 1) 컬럼 스케일 재확인
  const cols: any[] = await prisma.$queryRawUnsafe(
    `select column_name, numeric_scale from information_schema.columns where table_name='products' and column_name in ('supplyPrice','salesPrice')`
  );
  console.log("컬럼 스케일:", JSON.stringify(cols));

  // 2) 소수 3자리 이상 값이 실제로 저장돼 있는지 (raw)
  const raw: any[] = await prisma.$queryRawUnsafe(
    `select name, "supplyPrice", "salesPrice", "updatedAt" from products where "supplyPrice" is not null order by "updatedAt" desc limit 8`
  );
  console.log("\n최근 저장된 단가 (raw DB 값):");
  for (const r of raw) console.log(`  ${r.name} | 구매:${r.supplyPrice} | 판매:${r.salesPrice} | ${new Date(r.updatedAt).toISOString().slice(0,16)}`);

  // 3) 소수부 3자리 값 개수
  const three: any[] = await prisma.$queryRawUnsafe(
    `select count(*)::int as c from products where "supplyPrice" is not null and ("supplyPrice"*1000) %10 <> 0`
  );
  console.log("\n소수 셋째자리가 살아있는 행 수:", three[0]?.c);
}
main().then(() => prisma.$disconnect()).catch((e) => { console.error("오류:", e); prisma.$disconnect(); process.exit(1); });
