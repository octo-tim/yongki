import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveFileBuffer } from "@/lib/storage";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const f = await prisma.libraryDoc.findUnique({ where: { id: params.id }, select: { data: true, storageKey: true, fileName: true, fileType: true } });
  if (!f) return new NextResponse("Not found", { status: 404 });

  const buf = await resolveFileBuffer(f as any);
  if (!buf) return new NextResponse("Not found", { status: 404 });
  const type = f.fileType || "application/octet-stream";
  const inlineable = /^(image\/|application\/pdf|text\/)/.test(type);
  return new NextResponse(buf, {
    headers: {
      "Content-Type": type,
      "Content-Length": String(buf.length),
      "Content-Disposition": `${inlineable ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(f.fileName)}`,
      "Cache-Control": "private, max-age=300",
    },
  });
}
