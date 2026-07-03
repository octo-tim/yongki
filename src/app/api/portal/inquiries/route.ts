import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const role = (session.user as any).role;
  const b = await req.json();
  const subject = String(b.subject || "").trim();
  const content = String(b.content || "").trim();
  if (!subject || !content) return NextResponse.json({ error: "제목/내용 필수" }, { status: 400 });

  let clientId: string | null = null;
  const projectId = b.projectId || null;
  if (role === "CLIENT") {
    clientId = (session.user as any).clientId;
    if (projectId) {
      const p = await prisma.project.findUnique({ where: { id: projectId }, select: { clientId: true } });
      if (p && p.clientId !== clientId) return NextResponse.json({ error: "권한 없음" }, { status: 403 });
    }
  } else {
    clientId = b.clientId || null;
    if (!clientId && projectId) {
      const p = await prisma.project.findUnique({ where: { id: projectId }, select: { clientId: true } });
      clientId = p?.clientId ?? null;
    }
    if (!clientId) return NextResponse.json({ error: "업체 정보 필요" }, { status: 400 });
  }

  if (!clientId) return NextResponse.json({ error: "업체 정보 필요" }, { status: 400 });

  const senderType = role === "CLIENT" ? "CLIENT" : "STAFF";
  const senderName = session.user?.name ?? (role === "CLIENT" ? "고객" : "담당자");

  const inquiry = await prisma.clientInquiry.create({
    data: {
      subject, clientId: clientId as string, projectId,
      status: senderType === "STAFF" ? "답변완료" : "답변대기",
      messages: { create: { senderType, senderName, content } },
    },
  });
  return NextResponse.json({ id: inquiry.id });
}
