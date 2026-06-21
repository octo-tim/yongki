import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getStatusConfig } from "@/lib/status-config";
import { furthestStep, statusOfStep, STEP_BUCKETS, STEP_ORDER } from "@/lib/steps";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fmtDate, fmtMoney, cn } from "@/lib/utils";
import { Download, PlusCircle, Search, Package, Building2, Factory, User, CalendarDays, List, LayoutGrid } from "lucide-react";
import { StepSelect } from "@/components/step-select";
import { ProjectRowDelete } from "@/components/project-row-delete";

export const dynamic = "force-dynamic";

const TOTAL_STEPS = STEP_ORDER.length;

type P = Awaited<ReturnType<typeof getProjects>>[number];
async function getProjects(where: Prisma.ProjectWhereInput) {
  return prisma.project.findMany({
    where, orderBy: { orderDate: "desc" },
    include: { client: true, factory: true, manager: true, steps: { select: { name: true, done: true } } },
  });
}
function calc(p: P) {
  const doneCount = p.steps.filter((s) => s.done).length;
  const pct = Math.round((doneCount / TOTAL_STEPS) * 100);
  const cur = furthestStep(p.steps) ?? "시작전";
  const st = statusOfStep(cur);
  const isDone = p.steps.some((s) => s.name === "고객인도" && s.done);
  return { doneCount, pct, cur, st, isDone };
}

export default async function ProjectsPage({ searchParams }: { searchParams: { q?: string; step?: string; view?: string } }) {
  const statusCfg = await getStatusConfig();
  const q = searchParams.q?.trim();
  const view = searchParams.view === "tile" ? "tile" : "list"; // 기본: 목록형

  const where: Prisma.ProjectWhereInput = {};
  if (q) {
    where.OR = [
      { productName: { contains: q, mode: "insensitive" } },
      { orderNo: { contains: q, mode: "insensitive" } },
      { client: { name: { contains: q, mode: "insensitive" } } },
      { factory: { name: { contains: q, mode: "insensitive" } } },
    ];
  }

  const projects = await getProjects(where);

  const groups = new Map<string, P[]>();
  for (const p of projects) {
    const key = furthestStep(p.steps) ?? "시작전";
    const arr = groups.get(key);
    if (arr) arr.push(p); else groups.set(key, [p]);
  }
  const allBuckets = STEP_BUCKETS.filter((b) => (groups.get(b)?.length ?? 0) > 0);
  const selected = searchParams.step && allBuckets.includes(searchParams.step) ? searchParams.step : null;
  const list = selected ? groups.get(selected)! : projects;

  const hrefFor = (step: string | null, viewMode: string) => {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (step) sp.set("step", step);
    if (viewMode === "tile") sp.set("view", "tile");
    const s = sp.toString();
    return `/projects${s ? `?${s}` : ""}`;
  };

  const exportQs = new URLSearchParams();
  if (q) exportQs.set("q", q);

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

      {/* 검색 + 뷰 토글 */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <form className="flex items-center gap-2" action="/projects" method="get">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input name="q" defaultValue={q} placeholder="상품명 · 주문번호 · 업체 · 공장 검색" className="h-10 rounded-full pl-9" />
            </div>
            {selected && <input type="hidden" name="step" value={selected} />}
            {view === "tile" && <input type="hidden" name="view" value="tile" />}
            <Button type="submit" variant="secondary" className="rounded-full">검색</Button>
            {(q || selected) && <Button asChild variant="ghost" className="rounded-full"><Link href={view === "tile" ? "/projects?view=tile" : "/projects"}>초기화</Link></Button>}
          </form>

          {/* 뷰 토글 */}
          <div className="inline-flex shrink-0 rounded-full border bg-card p-0.5 shadow-sm">
            <Link href={hrefFor(selected, "list")}
              className={cn("flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                view === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent")}>
              <List className="h-3.5 w-3.5" /> 목록
            </Link>
            <Link href={hrefFor(selected, "tile")}
              className={cn("flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                view === "tile" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent")}>
              <LayoutGrid className="h-3.5 w-3.5" /> 타일
            </Link>
          </div>
        </div>

        {/* 단계 필터 */}
        <div className="flex flex-wrap gap-1.5">
          <Link href={hrefFor(null, view)}
            className={cn("rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              !selected ? "border-foreground bg-foreground text-background" : "bg-background hover:bg-accent")}>
            전체 <span className="ml-0.5 opacity-70">{projects.length}</span>
          </Link>
          {allBuckets.map((b) => (
            <Link key={b} href={hrefFor(b, view)}
              className={cn("rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                selected === b ? "border-foreground bg-foreground text-background" : "bg-background hover:bg-accent")}>
              {b} <span className="ml-0.5 opacity-60">{groups.get(b)!.length}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* 본문 */}
      {list.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-20 text-center">
          <Package className="h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 text-sm text-muted-foreground">표시할 프로젝트가 없습니다.</p>
        </div>
      ) : view === "tile" ? (
        /* 타일형 */
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {list.map((p) => {
            const { doneCount, pct, cur, st, isDone } = calc(p);
            return (
              <Link key={p.id} href={`/projects/${p.id}`} className="group block">
                <div className="overflow-hidden rounded-2xl border bg-card shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg">
                  <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-muted/40 to-muted/10">
                    {p.productPhoto ? (
                      <img src={p.productPhoto} alt="" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center"><Package className="h-10 w-10 text-muted-foreground/30" /></div>
                    )}
                    <span className={cn("absolute left-2.5 top-2.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold shadow-sm backdrop-blur", statusCfg.style[st] ?? "bg-white/80")}>{cur}</span>
                    {isDone && <span className="absolute right-2.5 top-2.5 rounded-full bg-emerald-500 px-2 py-0.5 text-[11px] font-semibold text-white shadow-sm">완료</span>}
                  </div>
                  <div className="space-y-3 p-3.5">
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold leading-tight group-hover:text-primary">{p.productName}</h3>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">{p.orderNo ?? "주문번호 미지정"}</p>
                    </div>
                    <div>
                      <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>진행률</span><span className="tabular-nums">{doneCount}/{TOTAL_STEPS}</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                        <div className={cn("h-full rounded-full", isDone ? "bg-emerald-500" : "bg-primary")} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <dl className="space-y-1.5 text-xs">
                      <Meta icon={Building2} label="업체" value={p.client?.name} />
                      <Meta icon={Factory} label="공장" value={p.factory?.name} />
                      <Meta icon={CalendarDays} label="완료예정" value={fmtDate(p.shipRequestDate)} />
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
      ) : (
        /* 목록형 */
        <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                  <th className="px-3 py-3 font-semibold">단계</th>
                  <th className="px-3 py-3 font-semibold">주문번호</th>
                  <th className="px-3 py-3 font-semibold">제품사진</th>
                  <th className="px-3 py-3 font-semibold">제품명</th>
                  <th className="px-3 py-3 text-right font-semibold">수량</th>
                  <th className="px-3 py-3 font-semibold">업체</th>
                  <th className="px-3 py-3 font-semibold">제작공장</th>
                  <th className="px-3 py-3 font-semibold">완료예정일</th>
                  <th className="px-3 py-3 font-semibold">담당자</th>
                  <th className="w-10 px-2 py-3 text-right"></th>
                </tr>
              </thead>
              <tbody>
                {list.map((p) => {
                  return (
                    <tr key={p.id} className="group border-b last:border-0 transition-colors hover:bg-accent/40">
                      <td className="px-3 py-2.5">
                        <StepSelect projectId={p.id} current={p.status} size="sm" />
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-xs text-muted-foreground">{p.orderNo ?? "-"}</td>
                      <td className="px-3 py-2.5">
                        <Link href={`/projects/${p.id}`} className="block">
                          {p.productPhoto ? (
                            <img src={p.productPhoto} alt="" className="h-10 w-10 rounded-lg border object-cover" />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-dashed bg-muted/30"><Package className="h-4 w-4 text-muted-foreground/40" /></div>
                          )}
                        </Link>
                      </td>
                      <td className="px-3 py-2.5">
                        <Link href={`/projects/${p.id}`} className="font-semibold group-hover:text-primary">{p.productName}</Link>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums">{fmtMoney(p.quantity)}</td>
                      <td className="px-3 py-2.5">{p.client?.name ?? "-"}</td>
                      <td className="max-w-[12rem] truncate px-3 py-2.5 text-muted-foreground">{p.factory?.name ?? "-"}</td>
                      <td className="whitespace-nowrap px-3 py-2.5">{fmtDate(p.shipRequestDate)}</td>
                      <td className="whitespace-nowrap px-3 py-2.5">{p.manager?.name ?? "-"}</td>
                      <td className="px-2 py-2.5 text-right"><ProjectRowDelete projectId={p.id} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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
