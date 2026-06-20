import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { type, title, content, meetingDate, clientId, projectId } = await req.json();
  const t = type === "EXTERNAL" ? "EXTERNAL" : "INTERNAL";
  if (!title?.trim()) return NextResponse.json({ error: "회의 제목을 입력하세요." }, { status: 400 });
  if (!content?.trim()) return NextResponse.json({ error: "회의 내용을 입력하세요." }, { status: 400 });
  if (!meetingDate) return NextResponse.json({ error: "회의 일자를 선택하세요." }, { status: 400 });
  if (t === "EXTERNAL" && !clientId) return NextResponse.json({ error: "외부회의는 거래처를 지정하세요." }, { status: 400 });

  const meeting = await prisma.meeting.create({
    data: {
      type: t, title: title.trim(), content: content.trim(),
      meetingDate: new Date(meetingDate),
      clientId: t === "EXTERNAL" ? clientId : null,
      projectId: projectId || null,
      createdById: (session.user as any).id,
    },
  });
  return NextResponse.json(meeting);
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id 필수" }, { status: 400 });
  await prisma.meeting.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
