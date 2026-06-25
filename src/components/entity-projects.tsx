import Link from "next/link";
import { cn, fmtDate } from "@/lib/utils";
import { STEP_ORDER } from "@/lib/steps";

type Step = { type: string; group: string; name: string; order: number; done: boolean; doneAt: any; staff: string | null };
type Proj = {
  id: string; productName: string; status: string; orderDate: any; expectedCompletionDate: any;
  steps: Step[];
};

const SHIPPING_STEPS = new Set(["창고입고", "검품", "출고", "한국도착", "고객인도"]);

// 현재 단계: status(명시적 선택)가 유효 단계명이면 우선, 아니면 진행된(완료) 단계 중 가장 마지막
function currentStepName(p: Proj): string {
  if (p.status && STEP_ORDER.includes(p.status)) return p.status;
  const done = new Set(p.steps.filter((s) => s.done || s.doneAt).map((s) => s.name));
  for (let i = STEP_ORDER.length - 1; i >= 0; i--) if (done.has(STEP_ORDER[i])) return STEP_ORDER[i];
  return "";
}

function ProjectRow({ p }: { p: Proj }) {
  const total = p.steps.length || STEP_ORDER.length;
  const done = p.steps.filter((s) => s.done || s.doneAt).length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const cur = currentStepName(p);
  const curStep = p.steps.find((s) => s.name === cur) ?? null;
  const accent = cur && SHIPPING_STEPS.has(cur) ? "bg-emerald-500" : "bg-blue-500";
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md border p-3 text-sm">
      <Link href={`/projects/${p.id}`} className="min-w-[140px] flex-1 font-medium hover:underline">{p.productName}</Link>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">현재단계</span>
        <span className="font-medium">{cur || "-"}</span>
        {curStep?.staff && <span className="text-xs text-muted-foreground">· {curStep.staff}</span>}
      </div>
      <div className="flex items-center gap-2">
        <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
          <div className={cn("h-full rounded-full", accent)} style={{ width: `${pct}%` }} />
        </div>
        <span className="tabular-nums text-xs text-muted-foreground">{done}/{total}</span>
      </div>
      <div className="text-xs text-muted-foreground">주문 {fmtDate(p.orderDate)}</div>
    </div>
  );
}

export function EntityProjects({ projects }: { projects: Proj[]; statusCfg?: any }) {
  if (projects.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">등록된 프로젝트가 없습니다.</p>;
  }
  // 현재 단계별 그룹 (STEP_ORDER 순)
  const groups = STEP_ORDER
    .map((st) => ({ step: st, rows: projects.filter((p) => currentStepName(p) === st) }))
    .filter((g) => g.rows.length > 0);
  const none = projects.filter((p) => !currentStepName(p));

  return (
    <div className="space-y-5">
      {groups.map(({ step, rows }) => (
        <div key={step} className="space-y-2">
          <div className="flex items-center gap-2">
            <span className={cn("rounded-full border px-2.5 py-0.5 text-xs font-semibold",
              SHIPPING_STEPS.has(step) ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-blue-200 bg-blue-50 text-blue-700")}>
              {step}
            </span>
            <span className="text-xs text-muted-foreground">{rows.length}건</span>
          </div>
          <div className="space-y-1.5">
            {rows.map((p) => <ProjectRow key={p.id} p={p} />)}
          </div>
        </div>
      ))}
      {none.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="rounded-full border px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">단계 미정</span>
            <span className="text-xs text-muted-foreground">{none.length}건</span>
          </div>
          <div className="space-y-1.5">{none.map((p) => <ProjectRow key={p.id} p={p} />)}</div>
        </div>
      )}
    </div>
  );
}
