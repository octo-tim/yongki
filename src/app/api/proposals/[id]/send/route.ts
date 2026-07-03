import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import nodemailer from "nodemailer";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { quotationHtml } from "@/lib/quotation-html";
import type { QuoteItem } from "@/lib/company";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role === "CLIENT") return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) return NextResponse.json({ error: "메일 설정 필요: Railway 환경변수 GMAIL_USER, GMAIL_APP_PASSWORD를 추가하세요" }, { status: 500 });

  const b = await req.json();
  const to = String(b.to || "").trim();
  if (!to) return NextResponse.json({ error: "받는 사람 이메일 필수" }, { status: 400 });

  const p = await prisma.proposal.findUnique({
    where: { id: params.id },
    include: { client: { select: { name: true, contact: true } }, creator: { select: { name: true } } },
  });
  if (!p) return NextResponse.json({ error: "제안서 없음" }, { status: 404 });

  const html = quotationHtml({
    title: p.title, sentDate: p.sentDate, validUntil: p.validUntil, note: p.note,
    vatApplied: p.vatApplied ?? true, currency: p.currency, productName: p.productName,
    items: (Array.isArray(p.items) ? p.items : []) as unknown as QuoteItem[],
    clientName: p.client?.name ?? "고객", clientContact: p.client?.contact, creatorName: p.creator?.name,
  });

  const transporter = nodemailer.createTransport({ service: "gmail", auth: { user, pass } });
  try {
    await transporter.verify();
  } catch (e: any) {
    return NextResponse.json({ error: `Gmail 인증 실패 — GMAIL_USER/GMAIL_APP_PASSWORD 확인 필요 (${e.message})` }, { status: 500 });
  }
  const attachments: any[] = [];
  if (p.fileName && p.data) attachments.push({ filename: p.fileName, content: Buffer.from(p.data as any) });

  try {
    await transporter.sendMail({
      from: `"(주)비케이브로" <${user}>`,
      to,
      subject: `[견적서] ${p.title}`,
      html,
      attachments,
    });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: `전송 실패: ${e.message}` }, { status: 500 });
  }
}
