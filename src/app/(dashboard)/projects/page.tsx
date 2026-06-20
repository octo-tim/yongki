import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getStatusConfig } from "@/lib/status-config";
import { furthestStep, statusOfStep, STEP_BUCKETS, STEP_ORDER } from "@/lib/steps";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fmtDate, fmtMoney, cn } from "@/lib/utils";
import { Download, PlusCircle, Search, Package, Building2, Factory, User, CalendarDays, Boxes } from "lucide-react";

export const dynamic = "force-dynamic";

const TOTAL_STEPS = STEP_ORDER.length;

export default async function ProjectsPage({ searchParams }: { searchParams: { q?: string; step?: string } }) {
  const statusCfg = await getStatusConfig();
  const q = searchParams.q?.trim();

  const where: Prisma.ProjectWhereInput = {};
  if (q) {
    where.OR = [
      { productName: { contains: q, mode: "insensitive" } },
      { orderNo: { contains: q, mode: "insensitive" } },
      { client: { name: { contains: q, mode: "insensitive" } } },
      { factory: { name: { contains: q, mode: "insensitive" } } },
    ];
  }

  const projects = await prisma.project.findMany({
    where, orderBy: { orderDate: "desc" },
    include: { client: true, factory: true, manager: true, steps: { select: { name: true, done: true } } },
  });

  // 단계별(가장 멀리 완료된 단계) 그룹 + 필터
  const groups = new Map<string, typeof projects>();
  for (const p of projects) {
    const key = furthestStep(p.steps) ?? "시작전";
    const arr = groups.get(key);
    if (arr) arr.push(p); else groups.set(key, [p]);
  }
  const allBuckets = STEP_BUCKETS.filter((b) => (groups.get(b)?.length ?? 0) > 0);
  const selected = searchParams.step && allBuckets.includes(searchParams.step) ? searchParams.step : null;
  const list = selected ? groups.get(selected)! : projects;

  const completed = projects.filter((p) => p.steps.some((s) => s.name === "고객인도" && s.done)).length;
  const inProgress = projects.length - completed;

  const exportQs = new URLSearchParams();
  if (q) exportQs.set("q", q);

  const summary = [
    { label: "전체 프로젝트", value: projects.length, icon: Boxes, tint: "from-slate-50 to-slate-100 text-slate-700", ring: "ring-slate-200" },
    { label: "진행중", value: inProgress, icon: Package, tint: "from-blue-50 to-indigo-50 text-blue-700", ring: "ring-blue-200" },
    { label: "완료", value: completed, icon: CalendarDays, tint: "from-emerald-50 to-teal-50 text-emerald-700", ring: "ring-emerald-200" },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      {/* 헤더 */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">프로젝트 관리</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {selected ? <>단계 <span className="font-medium text-foreground">{selected}</span></> : "전체"} · {list.length}건
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" className="rounded-full">
            <a href={`/api/export?${exportQs.toString()}`}><Download className="h-4 w-4" /> 엑셀</a>
          </Button>
          <Button asChild className="rounded-full shadow-sm">
            <Link href="/projects/new"><PlusCircle className="h-4 w-4" /> 새 프로젝트</Link>
          </Button>
        </div>
      </div>

      {/* 요약 타일 */}
      <div className="grid grid-cols-3 gap-3">
        {summary.map((s) => (
          <div key={s.label} className={cn("flex items-center gap-3 rounded-2xl bg-gradient-to-br p-4 ring-1", s.tint, s.ring)}>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/70 shadow-sm">
              <s.icon className="h-5 w-5" />
            </div>
            <div>
              <div className="text-2xl font-bold leading-none tabular-nums">{s.value}</div>
              <div className="mt-1 text-xs font-medium opacity-80">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* 검색 + 필터 */}
      <div className="space-y-3">
        <form className="flex items-center gap-2" action="/projects" method="get">
          <div className="relative flex-1 sm:max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input name="q" defaultValue={q} placeholder="상품명 · 주문번호 · 업체 · 공장 검색" className="h-10 rounded-full pl-9" />
          </div>
          {selected && <input type="hidden" name="step" value={selected} />}
          <Button type="submit" variant="secondary" className="rounded-full">검색</Button>
          {(q || selected) && <Button asChild variant="ghost" className="rounded-full"><Link href="/projects">초기화</Link></Button>}
        </form>

        <div className="flex flex-wrap gap-1.5">
          <Link href={`/projects${q ? `?q=${encodeURIComponent(q)}` : ""}`}
            className={cn("rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              !selected ? "border-foreground bg-foreground text-background" : "bg-background hover:bg-accent")}>
            전체 <span className="ml-0.5 opacity-70">{projects.length}</span>
          </Link>
          {allBuckets.map((b) => (
            <Link key={b} href={`/projects?step=${encodeURIComponent(b)}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
              className={cn("rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                selected === b ? "border-foreground bg-foreground text-background" : "bg-background hover:bg-accent")}>
              {b} <span className="ml-0.5 opacity-60">{groups.get(b)!.length}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* 카드 그리드 */}
      {list.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-20 text-center">
          <Package className="h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 text-sm text-muted-foreground">표시할 프로젝트가 없습니다.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {list.map((p) => {
            const doneCount = p.steps.filter((s) => s.done).length;
            const pct = Math.round((doneCount / TOTAL_STEPS) * 100);
            const cur = furthestStep(p.steps) ?? "시작전";
            const st = statusOfStep(cur);
            const isDone = p.steps.some((s) => s.name === "고객인도" && s.done);
            return (
              <Link key={p.id} href={`/projects/${p.id}`} className="group block">
                <div className="overflow-hidden rounded-2xl border bg-card shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-lg">
                  {/* 사진 */}
                  <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-muted/40 to-muted/10">
                    {p.productPhoto ? (
                      <img src={p.productPhoto} alt="" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Package className="h-10 w-10 text-muted-foreground/30" />
                      </div>
                    )}
                    <span className={cn("absolute left-2.5 top-2.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold shadow-sm backdrop-blur", statusCfg.style[st] ?? "bg-white/80")}>
                      {cur}
                    </span>
                    {isDone && (
                      <span className="absolute right-2.5 top-2.5 rounded-full bg-emerald-500 px-2 py-0.5 text-[11px] font-semibold text-white shadow-sm">완료</span>
                    )}
                  </div>

                  {/* 본문 */}
                  <div className="space-y-3 p-3.5">
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold leading-tight group-hover:text-primary">{p.productName}</h3>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">{p.orderNo ?? "주문번호 미지정"}</p>
                    </div>

                    {/* 진행률 */}
                    <div>
                      <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>진행률</span><span className="tabular-nums">{doneCount}/{TOTAL_STEPS}</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                        <div className={cn("h-full rounded-full transition-all", isDone ? "bg-emerald-500" : "bg-primary")} style={{ width: `${pct}%` }} />
                      </div>
                    </div>

                    {/* 메타 */}
                    <dl className="space-y-1.5 text-xs">
                      <Meta icon={Building2} label="업체" value={p.client?.name} />
                      <Meta icon={Factory} label="공장" value={p.factory?.name} />
                      <Meta icon={CalendarDays} label="완성예정" value={fmtDate(p.expectedCompletionDate)} />
                      <div className="flex items-center justify-between pt-1">
                        <span className="flex items-center gap-1.5 text-muted-foreground"><User className="h-3.5 w-3.5" /> {p.manager?.name ?? "-"}</span>
                        <span className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium tabular-nums">{fmtMoney(p.quantity)}개</span>
                      </div>
                    </dl>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Meta({ icon: Icon, label, value }: { icon: any; label: string; value?: string | null }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="flex shrink-0 items-center gap-1.5 text-muted-foreground"><Icon className="h-3.5 w-3.5" /> {label}</span>
      <span className="truncate text-right font-medium">{value || "-"}</span>
    </div>
  );
}
