import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

// 업로드 저장 위치 (운영: Railway Volume 경로를 UPLOAD_DIR 로 지정 / 로컬 기본: public/uploads)
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), "public", "uploads");

const TYPES: Record<string, string> = {
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif",
  ".webp": "image/webp", ".bmp": "image/bmp", ".svg": "image/svg+xml",
  ".heic": "image/heic", ".heif": "image/heif", ".pdf": "application/pdf",
};

export async function GET(_req: NextRequest, { params }: { params: { path?: string[] } }) {
  const segs = (params.path || []).map((s) => decodeURIComponent(s));
  if (segs.length === 0 || segs.some((s) => !s || s.includes("..") || s.includes("/") || s.includes("\\"))) {
    return new NextResponse("Bad request", { status: 400 });
  }
  const base = path.resolve(UPLOAD_DIR);
  const fp = path.resolve(path.join(base, ...segs));
  if (fp !== base && !fp.startsWith(base + path.sep)) {
    return new NextResponse("Forbidden", { status: 403 });
  }
  try {
    const buf = await readFile(fp);
    const ext = path.extname(fp).toLowerCase();
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": TYPES[ext] || "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
