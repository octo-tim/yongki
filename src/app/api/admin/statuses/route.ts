import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session) return { error: "unauthorized", status: 401 } as const;
  if ((session.user as any).role !== "ADMIN") return { error: "forbidden", status: 403 } as const;
  return { session } as const;
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const b = await req.json();
  const items: { key: string; label: string; color: string; sortOrder: number }[] = Array.isArray(b.items) ? b.items : [];
  await prisma.$transaction(
    items.map((it) =>
      prisma.statusSetting.upsert({
        where: { key: it.key as any },
        update: { label: it.label, color: it.color, sortOrder: it.sortOrder },
        create: { key: it.key as any, label: it.label, color: it.color, sortOrder: it.sortOrder },
      })
    )
  );
  return NextResponse.json({ ok: true });
}
