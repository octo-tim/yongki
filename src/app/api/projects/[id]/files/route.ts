import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const MAX = 25 * 1024 * 1024; // 25MB

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "파일 없음" }, { status: 400 });

  const bytes = Buffer.from(await file.arrayBuffer());
  if (bytes.length > MAX) return NextResponse.json({ error: "파일이 너무 큽니다 (최대 25MB)" }, { status: 400 });

  const saved = await prisma.projectFile.create({
    data: { projectId: params.id, fileName: file.name, filePath: "", fileType: file.type || "application/octet-stream", fileSize: bytes.length, data: bytes },
  });
  await prisma.projectFile.update({ where: { id: saved.id }, data: { filePath: `/api/files/${saved.id}` } });
  await prisma.projectLog.create({
    data: { projectId: params.id, actorId: (session.user as any).id, action: "FILE_UPLOAD", message: `파일 업로드: ${file.name}` },
  });
  return NextResponse.json({ id: saved.id, fileName: saved.fileName, filePath: `/api/files/${saved.id}`, fileSize: saved.fileSize });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const fileId = req.nextUrl.searchParams.get("fileId");
  if (!fileId) return NextResponse.json({ error: "fileId 필수" }, { status: 400 });
  await prisma.projectFile.deleteMany({ where: { id: fileId, projectId: params.id } });
  return NextResponse.json({ ok: true });
}
