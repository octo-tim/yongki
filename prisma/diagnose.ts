/**
 * 프로젝트 상세 페이지 서버 예외 진단.
 * 실행:  DATABASE_URL="<공개DB_URL>" npx tsx prisma/diagnose.ts
 * 결과의 오류 메시지 / 스택을 그대로 복사해 주세요.
 */
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  // 1) PaymentType enum 값 (INTERIM 반영 여부)
  try {
    const en: any[] = await prisma.$queryRawUnsafe(
      `select e.enumlabel from pg_enum e join pg_type t on e.enumtypid=t.oid where t.typname='PaymentType' order by e.enumsortorder`
    );
    console.log("PaymentType enum:", en.map((r) => r.enumlabel).join(", "));
  } catch (e: any) { console.log("enum 조회 실패:", e.message); }

  // 2) products 단가 컬럼 타입 (numeric scale 반영 여부)
  try {
    const cols: any[] = await prisma.$queryRawUnsafe(
      `select column_name, numeric_precision, numeric_scale from information_schema.columns where table_name='products' and column_name in ('supplyPrice','salesPrice')`
    );
    console.log("단가 컬럼:", JSON.stringify(cols));
  } catch (e: any) { console.log("컬럼 조회 실패:", e.message); }

  // 3) project_files 컬럼 존재 확인
  try {
    const fcols: any[] = await prisma.$queryRawUnsafe(
      `select column_name from information_schema.columns where table_name='project_files'`
    );
    console.log("project_files 컬럼:", fcols.map((r) => r.column_name).join(", "));
  } catch (e: any) { console.log("files 컬럼 조회 실패:", e.message); }

  // 4) 상세 페이지와 동일한 쿼리 재현 (에이에스비 스포이드 프로젝트)
  const target = await prisma.project.findFirst({
    where: { productName: { contains: "원형 갈색 스포이드" } },
    select: { id: true, productName: true },
  });
  console.log("\n대상 프로젝트:", target ?? "(못 찾음 — 아무 프로젝트로 시도)");
  const id = target?.id ?? (await prisma.project.findFirst({ select: { id: true } }))?.id;
  if (!id) { console.log("프로젝트 없음"); return; }

  try {
    const p = await prisma.project.findUnique({
      where: { id },
      include: {
        client: true, factory: true, manager: true,
        steps: { orderBy: [{ type: "asc" }, { order: "asc" }] },
        files: { orderBy: { createdAt: "desc" }, select: { id: true, fileName: true, filePath: true, fileType: true, fileSize: true, createdAt: true } },
        notes: { orderBy: { createdAt: "desc" }, include: { author: true } },
        meetings: { orderBy: { meetingDate: "desc" }, include: { client: { select: { id: true, name: true } }, factory: { select: { id: true, name: true } }, createdBy: { select: { name: true } }, files: true } },
        clientRequests: { orderBy: { requestDate: "desc" }, include: { createdBy: { select: { name: true } } } },
        progressPhotos: { orderBy: { createdAt: "desc" }, include: { client: { select: { id: true, name: true } }, factory: { select: { id: true, name: true } }, createdBy: { select: { name: true } } } },
        workRequests: { orderBy: { requestDate: "desc" }, include: { requester: { select: { name: true } }, assignee: { select: { id: true, name: true } }, client: { select: { id: true, name: true } }, factory: { select: { id: true, name: true } }, updates: { orderBy: { progressDate: "asc" }, include: { createdBy: { select: { name: true } } } } } },
        payments: { orderBy: { receivedAt: "desc" } },
        products: { orderBy: { createdAt: "asc" } },
        costItems: { orderBy: { createdAt: "asc" } },
        memos: { orderBy: { createdAt: "desc" }, include: { author: true } },
        logs: { orderBy: { createdAt: "desc" }, take: 10, include: { actor: true } },
      },
    });
    console.log("\n상세 쿼리 성공 ✅  (payments:", p?.payments.length, "files:", p?.files.length, "products:", p?.products.length, ")");
    console.log("payment types:", p?.payments.map((x) => x.type).join(",") || "(없음)");
  } catch (e: any) {
    console.log("\n상세 쿼리 실패 ❌");
    console.log("메시지:", e.message);
    console.log("코드:", e.code);
  }
}

main().then(() => prisma.$disconnect()).catch((e) => { console.error("스크립트 오류:", e); prisma.$disconnect(); process.exit(1); });
