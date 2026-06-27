import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: { fileId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const f = await prisma.projectFile.findUnique({
    where: { id: params.fileId },
    select: { data: true, fileName: true, fileType: true },
  });
  if (!f || !f.data) return new NextResponse("Not found", { status: 404 });

  const buf = Buffer.from(f.data as any);
  const type = f.fileType || "application/octet-stream";
  const inlineable = /^(image\/|application\/pdf|text\/)/.test(type);
  const disp = inlineable ? "inline" : "attachment";
  return new NextResponse(buf, {
    headers: {
      "Content-Type": type,
      "Content-Length": String(buf.length),
      "Content-Disposition": `${disp}; filename*=UTF-8''${encodeURIComponent(f.fileName)}`,
      "Cache-Control": "private, max-age=300",
    },
  });
}
