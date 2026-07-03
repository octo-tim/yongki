import { getServerSession } from "next-auth";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { STEP_ORDER } from "@/lib/steps";
import { Card, CardContent } from "@/components/ui/card";
import { Package, ChevronRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PortalHome() {
  const session = await getServerSession(authOptions);
  const clientId = (session!.user as any).clientId as string;

  const projects = await prisma.project.findMany({
    where: { clientId }, orderBy: { orderDate: "desc" },
    select: { id: true, productName: true, productPhoto: true, orderNo: true, quantity: true, shipRequestDate: true, status: true, steps: { select: { name: true, done: true } } },
  });

  function curStep(p: (typeof projects)[number]) {
    if (p.status && STEP_ORDER.includes(p.status)) return p.status;
    for (let i = STEP_ORDER.length - 1; i >= 0; i--) if (p.steps.some((s) => s.name === STEP_ORDER[i] && s.done)) return STEP_ORDER[i];
    return STEP_ORDER[0];
  }
  function pct(p: (typeof projects)[number]) {
    const done = p.steps.filter((s) => s.done).length;
    return Math.round((done / STEP_ORDER.length) * 100);
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">진행 프로젝트</h1>
        <p className="text-sm text-muted-foreground">전체 {projects.length}건</p>
      </div>

      {projects.length === 0 && (
        <Card><CardContent className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
          <Package className="h-8 w-8 opacity-40" /><p className="text-sm">진행 중인 프로젝트가 없습니다.</p>
        </CardContent></Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {projects.map((p) => (
          <Link key={p.id} href={`/portal/projects/${p.id}`}>
            <Card className="transition-shadow hover:shadow-md">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border bg-muted/30">
                  {p.productPhoto ? <img src={p.productPhoto} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center"><Package className="h-6 w-6 text-muted-foreground/40" /></div>}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{p.productName}</p>
                  <p className="text-xs text-muted-foreground">{p.orderNo ?? "-"} · 수량 {p.quantity?.toLocaleString() ?? "-"}</p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${pct(p)}%` }} />
                    </div>
                    <span className="shrink-0 text-xs font-medium text-primary">{curStep(p)}</span>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
