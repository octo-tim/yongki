import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const MAX = 25 * 1024 * 1024;

// 직원이 고객 확인요청 파일 업로드
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role === "CLIENT") return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const form = await req.formData();
  const projectId = String(form.get("projectId") || "");
  const title = String(form.get("title") || "").trim();
  const memo = String(form.get("memo") || "").trim() || null;
  const file = form.get("file") as File | null;
  if (!projectId || !file) return NextResponse.json({ error: "프로젝트/파일 필수" }, { status: 400 });

  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { clientId: true } });
  if (!project) return NextResponse.json({ error: "프로젝트 없음" }, { status: 404 });

  const bytes = Buffer.from(await file.arrayBuffer());
  if (bytes.length > MAX) return NextResponse.json({ error: "파일이 너무 큽니다 (최대 25MB)" }, { status: 400 });

  const saved = await prisma.staffFileRequest.create({
    data: {
      projectId, clientId: project.clientId, title: title || file.name, memo,
      fileName: file.name, fileType: file.type || "application/octet-stream", fileSize: bytes.length, data: bytes,
      uploaderId: (session.user as any).id, uploaderName: session.user?.name ?? null,
    },
  });
  return NextResponse.json({ id: saved.id });
}
