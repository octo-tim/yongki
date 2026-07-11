import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { storeUpload } from "@/lib/storage";

const MAX = 25 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const role = (session.user as any).role;

  const form = await req.formData();
  const projectId = String(form.get("projectId") || "");
  const content = String(form.get("content") || "").trim();
  if (!projectId || !content) return NextResponse.json({ error: "내용 필수" }, { status: 400 });

  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { id: true, clientId: true } });
  if (!project) return NextResponse.json({ error: "프로젝트 없음" }, { status: 404 });

  let clientId: string | null = null;
  if (role === "CLIENT") {
    clientId = (session.user as any).clientId;
    if (project.clientId !== clientId) return NextResponse.json({ error: "권한 없음" }, { status: 403 });
  } else {
    clientId = project.clientId ?? String(form.get("clientId") || "");
  }
  if (!clientId) return NextResponse.json({ error: "업체 정보 없음" }, { status: 400 });

  const file = form.get("file") as File | null;
  let fileData: { fileName: string; fileType: string; fileSize: number; stored: { storageKey?: string; data?: Buffer } } | null = null;
  if (file && file.size > 0) {
    const bytes = Buffer.from(await file.arrayBuffer());
    if (bytes.length > MAX) return NextResponse.json({ error: "파일이 너무 큽니다 (최대 25MB)" }, { status: 400 });
    fileData = { fileName: file.name, fileType: file.type || "application/octet-stream", fileSize: bytes.length, stored: await storeUpload(bytes, { prefix: "portal-requests", fileName: file.name, contentType: file.type }) };
  }

  const saved = await prisma.clientPortalRequest.create({
    data: {
      projectId, clientId: clientId as string, content,
      ...(fileData ? { fileName: fileData.fileName, fileType: fileData.fileType, fileSize: fileData.fileSize, ...fileData.stored } : {}),
    },
  });
  return NextResponse.json({ id: saved.id });
}
