import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const MAX = 25 * 1024 * 1024; // 25MB

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const form = await req.formData();
  const title = String(form.get("title") || "").trim();
  const productName = String(form.get("productName") || "").trim() || null;
  const amountRaw = String(form.get("amount") || "").trim();
  const amount = amountRaw === "" ? null : Number(amountRaw);
  const currency = String(form.get("currency") || "KRW").trim() || "KRW";
  const clientId = String(form.get("clientId") || "").trim() || null;
  const sentDate = String(form.get("sentDate") || "").trim() || null;
  const note = String(form.get("note") || "").trim() || null;
  const file = form.get("file") as File | null;
  if (!title) return NextResponse.json({ error: "제목 필수" }, { status: 400 });

  let fileData: { fileName: string; fileType: string; fileSize: number; data: Buffer } | null = null;
  if (file && file.size > 0) {
    const bytes = Buffer.from(await file.arrayBuffer());
    if (bytes.length > MAX) return NextResponse.json({ error: "파일이 너무 큽니다 (최대 25MB)" }, { status: 400 });
    fileData = { fileName: file.name, fileType: file.type || "application/octet-stream", fileSize: bytes.length, data: bytes };
  }

  const saved = await prisma.proposal.create({
    data: {
      title, clientId, note, sentDate: sentDate ? new Date(sentDate) : null,
      productName, amount: amount != null && !isNaN(amount) ? amount : null, currency,
      creatorId: (session.user as any).id,
      ...(fileData ? { fileName: fileData.fileName, fileType: fileData.fileType, fileSize: fileData.fileSize, data: fileData.data } : {}),
    },
  });
  return NextResponse.json({ id: saved.id, title: saved.title });
}
