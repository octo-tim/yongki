// 기존 DB에 저장된 파일 바이너리(data)를 객체 스토리지(R2)로 이관하는 스크립트.
// 사용법: node scripts/migrate-files-to-storage.mjs
// 사전 조건: .env에 R2_* (또는 S3_*) 환경변수 설정 + prisma db push 완료
//
// 안전 설계:
//  - storageKey가 이미 있는 레코드는 건너뜀 (재실행 안전)
//  - 이관 성공 후에도 DB data는 남겨둠 (검증 후 별도로 정리)
//  - 배치 처리로 메모리 사용 최소화

import { PrismaClient } from "@prisma/client";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";

const prisma = new PrismaClient();

const R2_ACCOUNT = process.env.R2_ACCOUNT_ID;
const ENDPOINT = process.env.S3_ENDPOINT || (R2_ACCOUNT ? `https://${R2_ACCOUNT}.r2.cloudflarestorage.com` : undefined);
const REGION = process.env.S3_REGION || "auto";
const ACCESS_KEY = process.env.R2_ACCESS_KEY_ID || process.env.S3_ACCESS_KEY_ID;
const SECRET_KEY = process.env.R2_SECRET_ACCESS_KEY || process.env.S3_SECRET_ACCESS_KEY;
const BUCKET = process.env.R2_BUCKET || process.env.S3_BUCKET;

if (!ENDPOINT || !ACCESS_KEY || !SECRET_KEY || !BUCKET) {
  console.error("환경변수 미설정: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET 필요");
  process.exit(1);
}

const s3 = new S3Client({
  region: REGION, endpoint: ENDPOINT,
  credentials: { accessKeyId: ACCESS_KEY, secretAccessKey: SECRET_KEY },
  forcePathStyle: true,
});

async function put(buf, prefix, contentType) {
  const key = `${prefix}/${randomUUID()}`;
  await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: buf, ContentType: contentType || "application/octet-stream" }));
  return key;
}

// 모델별 이관 설정: [모델 접근자, prefix]
const MODELS = [
  ["projectFile", "project-files"],
  ["libraryDoc", "library"],
  ["proposal", "proposals"],
  ["clientPortalRequest", "portal-requests"],
  ["staffFileRequest", "staff-files"],
];

async function migrateModel(accessor, prefix) {
  const model = prisma[accessor];
  // storageKey 없고 data 있는 레코드
  const rows = await model.findMany({
    where: { storageKey: null, NOT: { data: null } },
    select: { id: true, fileType: true },
  });
  console.log(`[${accessor}] 이관 대상: ${rows.length}건`);
  let ok = 0, fail = 0;
  for (const row of rows) {
    try {
      // data는 크니 개별 조회
      const full = await model.findUnique({ where: { id: row.id }, select: { data: true, fileType: true } });
      if (!full?.data) continue;
      const buf = Buffer.from(full.data);
      const key = await put(buf, prefix, full.fileType);
      await model.update({ where: { id: row.id }, data: { storageKey: key } });
      ok++;
      if (ok % 20 === 0) console.log(`  ...${ok}건 완료`);
    } catch (e) {
      fail++;
      console.error(`  실패 id=${row.id}:`, e.message);
    }
  }
  console.log(`[${accessor}] 완료: 성공 ${ok}, 실패 ${fail}`);
}

async function main() {
  console.log("=== 파일 바이너리 → 객체 스토리지 이관 시작 ===");
  for (const [accessor, prefix] of MODELS) {
    await migrateModel(accessor, prefix);
  }
  console.log("=== 전체 이관 완료 ===");
  console.log("검증 후 DB의 data 컬럼을 정리하려면 별도 작업(스키마에서 data 제거 + db push)을 진행하세요.");
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
