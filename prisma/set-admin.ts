import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// 관리자 계정만 생성/갱신 (전체 시드와 무관, 안전하게 반복 실행 가능)
const ID = "관리자";
const PW = "2345";

async function main() {
  const password = await bcrypt.hash(PW, 10);
  const admin = await prisma.user.upsert({
    where: { email: ID },
    update: { password, name: "관리자", role: "ADMIN" },
    create: { email: ID, name: "관리자", password, role: "ADMIN" },
  });
  console.log(`✅ 관리자 계정 준비 완료 → 아이디: ${admin.email} / 비번: ${PW}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
