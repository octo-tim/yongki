/**
 * 오늘(KST) 테스트로 새로 만든 데이터 정리.
 *  대상: 오늘 생성된 '프로젝트'(테스트) + 그 프로젝트에 연결된 품목 + 오늘 등록된 진행사진
 *  보존: 기존 프로젝트의 품목/결재(오늘 마이그레이션으로 생성된 정상 데이터)는 삭제하지 않음
 *
 *  미리보기:  DATABASE_URL="<공개DB_URL>" npx tsx prisma/cleanup-today.ts
 *  실제삭제:  DATABASE_URL="<공개DB_URL>" DELETE=1 npx tsx prisma/cleanup-today.ts
 */
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const DO_DELETE = process.env.DELETE === "1";

function kstTodayStart() {
  const ymd = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
  return new Date(`${ymd}T00:00:00+09:00`);
}

async function main() {
  const since = kstTodayStart();
  const projects = await prisma.project.findMany({ where: { createdAt: { gte: since } }, select: { id: true, productName: true, orderNo: true } });
  const projIds = projects.map((p) => p.id);
  const prodCount = await prisma.product.count({ where: { projectId: { in: projIds } } });
  const photos = await prisma.progressPhoto.findMany({ where: { createdAt: { gte: since } }, select: { id: true, caption: true } });

  console.log(`기준(오늘 KST 0시): ${since.toISOString()}`);
  console.log(`오늘 생성된 프로젝트(삭제 대상): ${projects.length}건`);
  projects.forEach((p) => console.log(`   · ${p.productName}${p.orderNo ? ` [${p.orderNo}]` : ""} (${p.id})`));
  console.log(`  └ 연결된 품목: ${prodCount}건`);
  console.log(`오늘 등록된 진행사진(삭제 대상): ${photos.length}건`);

  if (!DO_DELETE) {
    console.log("\n*** 미리보기입니다. 삭제하지 않았습니다. 위 목록이 맞으면 DELETE=1 로 다시 실행하세요. ***");
    return;
  }

  // 프로젝트 삭제 시 cascade: 단계/결재/메모/특이사항/회의/요청/로그 등 함께 삭제됨
  const dProd = await prisma.product.deleteMany({ where: { projectId: { in: projIds } } });
  const dPhoto = await prisma.progressPhoto.deleteMany({ where: { createdAt: { gte: since } } });
  const dProj = await prisma.project.deleteMany({ where: { id: { in: projIds } } });
  console.log(`\n삭제 완료 — 프로젝트 ${dProj.count} · 품목 ${dProd.count} · 진행사진 ${dPhoto.count}`);
}

main().then(() => prisma.$disconnect()).catch((e) => { console.error(e); prisma.$disconnect(); process.exit(1); });
