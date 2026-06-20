import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// 여러 장 동시 등록: { photos:[{path}], caption, clientId, factoryId, projectId }
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { photos, caption, clientId, factoryId, projectId } = await req.json();
  const list = Array.isArray(photos) ? photos.filter((p: any) => p?.path) : [];
  if (list.length === 0) return NextResponse.json({ error: "사진을 업로드하세요." }, { status: 400 });

  const uid = (session.user as any).id;
  await prisma.progressPhoto.createMany({
    data: list.map((p: any) => ({
      path: p.path, caption: caption?.trim() || null,
      clientId: clientId || null, factoryId: factoryId || null, projectId: projectId || null,
      createdById: uid,
    })),
  });
  return NextResponse.json({ ok: true, count: list.length });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id 필수" }, { status: 400 });
  await prisma.progressPhoto.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
