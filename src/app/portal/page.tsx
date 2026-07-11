import { getServerSession } from "next-auth";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { STEP_ORDER } from "@/lib/steps";
import { Card, CardContent } from "@/components/ui/card";
import { Package, ChevronRight, FileText } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PortalHome() {
  const session = await getServerSession(authOptions);
  const clientId = (session!.user as any).clientId as string;

  const [projects, proposals] = await Promise.all([
    prisma.project.findMany({
      where: { clientId }, orderBy: { orderDate: "desc" },
      select: { id: true, productName: true, productPhoto: true, orderNo: true, quantity: true, shipRequestDate: true, status: true, steps: { select: { name: true, done: true } } },
    }),
    prisma.proposal.findMany({
      where: { clientId }, orderBy: { createdAt: "desc" },
      select: { id: true, title: true, amount: true, currency: true, status: true, sentDate: true, docType: true, invoiceKind: true, project: { select: { productName: true } } },
    }),
  ]);

  function curStep(p: (typeof projects)[number]) {
    if (p.status && STEP_ORDER.includes(p.status)) return p.status;
    for (let i = STEP_ORDER.length - 1; i >= 0; i--) if (p.steps.some((s) => s.name === STEP_ORDER[i] && s.done)) return STEP_ORDER[i];
    return STEP_ORDER[0];
  }
  function pct(p: (typeof projects)[number]) {
    const done = p.steps.filter((s) => s.done).length;
    return Math.round((done / STEP_ORDER.length) * 100);
  }

  const quotes = proposals.filter((q) => ((q as any).docType ?? "PROPOSAL") !== "INVOICE");
  const invoices = proposals.filter((q) => (q as any).docType === "INVOICE");
  const INV_KIND: Record<string, string> = { DEPOSIT: "계약금", BALANCE: "잔금", FULL: "전체" };

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

      {quotes.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-base font-bold">받은 견적서</h2>
          <div className="divide-y rounded-lg border bg-card">
            {quotes.map((q) => (
              <Link key={q.id} href={`/quote/${q.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-accent/50">
                <FileText className="h-4 w-4 shrink-0 text-violet-600" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {(q as any).project?.productName && <span className="text-muted-foreground">[{(q as any).project.productName}] </span>}
                    {q.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {q.sentDate ? `견적일 ${new Date(q.sentDate).toISOString().slice(0, 10)}` : ""}
                    {q.amount != null && ` · ${Number(q.amount).toLocaleString()} ${q.currency ?? "KRW"}`}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {invoices.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-base font-bold">받은 인보이스</h2>
          <div className="divide-y rounded-lg border bg-card">
            {invoices.map((q) => (
              <Link key={q.id} href={`/quote/${q.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-accent/50">
                <FileText className="h-4 w-4 shrink-0 text-rose-600" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {(q as any).project?.productName && <span className="text-muted-foreground">[{(q as any).project.productName}] </span>}
                    {q.title}
                    {(q as any).invoiceKind && INV_KIND[(q as any).invoiceKind] && <span className="ml-1 rounded bg-rose-100 px-1.5 py-0.5 text-[11px] font-medium text-rose-700">{INV_KIND[(q as any).invoiceKind]}</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {q.sentDate ? `발행일 ${new Date(q.sentDate).toISOString().slice(0, 10)}` : ""}
                    {q.amount != null && ` · ${Number(q.amount).toLocaleString()} ${q.currency ?? "KRW"}`}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
