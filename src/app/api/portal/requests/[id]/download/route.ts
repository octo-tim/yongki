import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const role = (session.user as any).role;

  const f = await prisma.clientPortalRequest.findUnique({ where: { id: params.id }, select: { data: true, fileName: true, fileType: true, clientId: true } });
  if (!f || !f.data) return new NextResponse("Not found", { status: 404 });
  if (role === "CLIENT" && f.clientId !== (session.user as any).clientId) return new NextResponse("Forbidden", { status: 403 });

  const buf = Buffer.from(f.data as any);
  const type = f.fileType || "application/octet-stream";
  const inlineable = /^(image\/|application\/pdf|text\/)/.test(type);
  return new NextResponse(buf, {
    headers: {
      "Content-Type": type,
      "Content-Length": String(buf.length),
      "Content-Disposition": `${inlineable ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(f.fileName || "file")}`,
      "Cache-Control": "private, max-age=300",
    },
  });
}
