import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const MAX = 25 * 1024 * 1024; // 25MB

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file") as File | null;
  const title = String(form.get("title") || "").trim();
  const category = String(form.get("category") || "").trim() || null;
  if (!file) return NextResponse.json({ error: "파일 없음" }, { status: 400 });

  const bytes = Buffer.from(await file.arrayBuffer());
  if (bytes.length > MAX) return NextResponse.json({ error: "파일이 너무 큽니다 (최대 25MB)" }, { status: 400 });

  const saved = await prisma.libraryDoc.create({
    data: {
      title: title || file.name, category, fileName: file.name,
      fileType: file.type || "application/octet-stream", fileSize: bytes.length, data: bytes,
      uploaderId: (session.user as any).id,
    },
  });
  return NextResponse.json({ id: saved.id, title: saved.title, fileName: saved.fileName, fileSize: saved.fileSize, category: saved.category });
}
