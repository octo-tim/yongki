import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { authOptions } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "파일 없음" }, { status: 400 });
  const bytes = Buffer.from(await file.arrayBuffer());
  const dir = path.join(process.cwd(), "public", "uploads", "photos");
  await mkdir(dir, { recursive: true });
  const safe = `${Date.now()}_${file.name.replace(/[^\w.\-가-힣]/g, "_")}`;
  await writeFile(path.join(dir, safe), bytes);
  return NextResponse.json({ path: `/uploads/photos/${safe}` });
}
