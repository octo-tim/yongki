/**
 * 진행단계에 '제작진행중'을 파일전달(공장)과 중간검품 사이(진행중 단계)에 추가.
 *   - 중간검품 order 5→6, 생산완료 order 6→7 로 보정
 *   - StepTemplate / 모든 프로젝트에 제작진행중(order 5, PRODUCTION) 생성(없으면)
 * 실행:  DATABASE_URL="<공개DB_URL>" npx tsx prisma/add-step-jejak.ts
 */
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  // 1) 순서 보정
  await prisma.stepTemplate.updateMany({ where: { name: "중간검품" }, data: { order: 6 } });
  await prisma.stepTemplate.updateMany({ where: { name: "생산완료" }, data: { order: 7 } });
  await prisma.projectStep.updateMany({ where: { name: "중간검품" }, data: { order: 6 } });
  await prisma.projectStep.updateMany({ where: { name: "생산완료" }, data: { order: 7 } });

  // 2) 템플릿에 제작진행중 추가
  const t = await prisma.stepTemplate.findFirst({ where: { name: "제작진행중" } });
  if (!t) await prisma.stepTemplate.create({ data: { type: "PRODUCTION", group: "제작진행중", name: "제작진행중", order: 5, active: true } });

  // 3) 모든 프로젝트에 제작진행중 추가
  const projects = await prisma.project.findMany({ select: { id: true } });
  let made = 0;
  for (const p of projects) {
    const exists = await prisma.projectStep.findFirst({ where: { projectId: p.id, name: "제작진행중" } });
    if (!exists) {
      await prisma.projectStep.create({ data: { projectId: p.id, type: "PRODUCTION", group: "제작진행중", name: "제작진행중", order: 5, done: false } });
      made++;
    }
  }
  console.log(`제작진행중 추가 — 프로젝트 ${made}/${projects.length}건 · 템플릿 ${t ? "기존" : "생성"}`);
}

main().then(() => prisma.$disconnect()).catch((e) => { console.error(e); prisma.$disconnect(); process.exit(1); });
