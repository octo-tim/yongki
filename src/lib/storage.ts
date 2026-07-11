// 객체 스토리지 (Cloudflare R2 / S3 호환) 유틸리티
// 파일 바이너리를 DB가 아닌 객체 스토리지에 저장한다.
// 환경변수:
//   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET
//   (또는 S3_ENDPOINT / S3_REGION / S3_ACCESS_KEY_ID / S3_SECRET_ACCESS_KEY / S3_BUCKET)
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";

const R2_ACCOUNT = process.env.R2_ACCOUNT_ID;
const ENDPOINT = process.env.S3_ENDPOINT || (R2_ACCOUNT ? `https://${R2_ACCOUNT}.r2.cloudflarestorage.com` : undefined);
const REGION = process.env.S3_REGION || "auto";
const ACCESS_KEY = process.env.R2_ACCESS_KEY_ID || process.env.S3_ACCESS_KEY_ID;
const SECRET_KEY = process.env.R2_SECRET_ACCESS_KEY || process.env.S3_SECRET_ACCESS_KEY;
export const BUCKET = process.env.R2_BUCKET || process.env.S3_BUCKET || "";

// 스토리지 사용 가능 여부 (환경변수 미설정 시 DB 폴백)
export const storageEnabled = !!(ENDPOINT && ACCESS_KEY && SECRET_KEY && BUCKET);

let _client: S3Client | null = null;
function client(): S3Client {
  if (!_client) {
    _client = new S3Client({
      region: REGION,
      endpoint: ENDPOINT,
      credentials: { accessKeyId: ACCESS_KEY as string, secretAccessKey: SECRET_KEY as string },
      forcePathStyle: true, // R2 호환
    });
  }
  return _client;
}

// 파일 업로드 → storageKey 반환
export async function putFile(buf: Buffer, opts: { prefix?: string; fileName?: string; contentType?: string }): Promise<string> {
  const prefix = (opts.prefix || "files").replace(/[^a-zA-Z0-9/_-]/g, "");
  const key = `${prefix}/${randomUUID()}`;
  await client().send(new PutObjectCommand({
    Bucket: BUCKET, Key: key, Body: buf,
    ContentType: opts.contentType || "application/octet-stream",
  }));
  return key;
}

// storageKey로 파일 다운로드 → Buffer
export async function getFile(key: string): Promise<Buffer> {
  const res = await client().send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  const bytes = await res.Body!.transformToByteArray();
  return Buffer.from(bytes);
}

// storageKey로 파일 삭제
export async function deleteFile(key: string): Promise<void> {
  try {
    await client().send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
  } catch { /* 이미 없거나 실패해도 무시 */ }
}

// storageKey 우선, 없으면 DB data 폴백으로 파일 내용을 가져온다 (점진 이관용)
export async function resolveFileBuffer(rec: { storageKey?: string | null; data?: Uint8Array | Buffer | null }): Promise<Buffer | null> {
  if (rec.storageKey && storageEnabled) {
    try { return await getFile(rec.storageKey); } catch { /* 폴백 */ }
  }
  if (rec.data) return Buffer.from(rec.data as any);
  return null;
}

// 업로드 헬퍼: 스토리지 사용 가능하면 R2에 올리고 { storageKey }, 아니면 { data } 반환
export async function storeUpload(buf: Buffer, opts: { prefix?: string; fileName?: string; contentType?: string }): Promise<{ storageKey?: string; data?: Buffer }> {
  if (storageEnabled) {
    const storageKey = await putFile(buf, opts);
    return { storageKey };
  }
  return { data: buf };
}
