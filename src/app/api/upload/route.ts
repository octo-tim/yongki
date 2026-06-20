import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { authOptions } from "@/lib/auth";

// 업로드 저장 위치 (운영: Railway Volume 경로를 UPLOAD_DIR 로 지정 / 로컬 기본: public/uploads)
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), "public", "uploads");

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "파일 없음" }, { status: 400 });

  const bytes = Buffer.from(await file.arrayBuffer());
  const dir = path.join(UPLOAD_DIR, "photos");
  await mkdir(dir, { recursive: true });
  const safe = `${Date.now()}_${file.name.replace(/[^\w.\-가-힣]/g, "_")}`;
  await writeFile(path.join(dir, safe), bytes);

  // 정적 경로 대신 /api/files 로 서빙 (볼륨/재배포에도 영속)
  return NextResponse.json({ path: `/api/files/photos/${encodeURIComponent(safe)}` });
}
