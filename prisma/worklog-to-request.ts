/**
 * 기존 업무현황(WorkLog) 데이터를 업무(WorkRequest)로 통합 이관.
 *   content/프로젝트/담당자/시작·종료일/상태(완료여부) 매핑. 같은 프로젝트+내용이 이미 있으면 건너뜀(중복방지).
 * 실행:  DATABASE_URL="<공개DB_URL>" npx tsx prisma/worklog-to-request.ts
 */
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const logs = await prisma.workLog.findMany();
  let made = 0, skipped = 0;
  for (const w of logs as any[]) {
    const dup = await prisma.workRequest.findFirst({ where: { projectId: w.projectId, content: w.content } });
    if (dup) { skipped++; continue; }
    await prisma.workRequest.create({
      data: {
        content: w.content,
        requestDate: w.startDate ?? w.createdAt,
        startDate: w.startDate ?? null,
        endDate: w.endDate ?? null,
        done: w.status === "DONE",
        requesterId: w.creatorId ?? null,
        assigneeId: w.assigneeId ?? null,
        projectId: w.projectId ?? null,
      },
    });
    made++;
  }
  console.log(`업무현황 → 업무 이관: 생성 ${made}건 · 중복건너뜀 ${skipped}건 (원본 WorkLog는 보존)`);
}

main().then(() => prisma.$disconnect()).catch((e) => { console.error(e); prisma.$disconnect(); process.exit(1); });
