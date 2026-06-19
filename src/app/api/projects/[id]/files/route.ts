import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "파일 없음" }, { status: 400 });

  const bytes = Buffer.from(await file.arrayBuffer());
  const dir = path.join(process.cwd(), "public", "uploads", params.id);
  await mkdir(dir, { recursive: true });
  const safe = `${Date.now()}_${file.name.replace(/[^\w.\-가-힣]/g, "_")}`;
  await writeFile(path.join(dir, safe), bytes);
  const publicPath = `/uploads/${params.id}/${safe}`;

  const saved = await prisma.projectFile.create({
    data: { projectId: params.id, fileName: file.name, filePath: publicPath, fileType: file.type, fileSize: bytes.length },
  });
  await prisma.projectLog.create({
    data: { projectId: params.id, actorId: (session.user as any).id, action: "FILE_UPLOAD", message: `파일 업로드: ${file.name}` },
  });
  return NextResponse.json(saved);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const fileId = req.nextUrl.searchParams.get("fileId");
  if (!fileId) return NextResponse.json({ error: "fileId 필수" }, { status: 400 });
  const f = await prisma.projectFile.findUnique({ where: { id: fileId } });
  if (f) {
    try { await unlink(path.join(process.cwd(), "public", f.filePath)); } catch {}
    await prisma.projectFile.delete({ where: { id: fileId } });
  }
  return NextResponse.json({ ok: true });
}
