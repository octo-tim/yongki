import Link from "next/link";
import { cn, fmtDate } from "@/lib/utils";

type Step = { type: string; group: string; name: string; order: number; done: boolean; doneAt: any; staff: string | null };
type Proj = {
  id: string; productName: string; status: string; orderDate: any; expectedCompletionDate: any;
  steps: Step[];
};
type StatusCfg = { label: Record<string, string>; style: Record<string, string>; order: string[] };

function summarize(steps: Step[]) {
  const sorted = [...steps].sort((a, b) =>
    a.type === b.type ? a.order - b.order : a.type === "PRODUCTION" ? -1 : 1);
  const filled = sorted.filter((s) => s.doneAt || s.staff);
  const total = sorted.length;
  const current = filled.length ? filled[filled.length - 1] : null;
  return { done: filled.length, total, current };
}

export function EntityProjects({ projects, statusCfg }: { projects: Proj[]; statusCfg: StatusCfg }) {
  if (projects.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">등록된 프로젝트가 없습니다.</p>;
  }
  // 상태별 그룹
  const groups = statusCfg.order
    .map((st) => ({ status: st, rows: projects.filter((p) => p.status === st) }))
    .filter((g) => g.rows.length > 0);

  return (
    <div className="space-y-5">
      {groups.map(({ status, rows }) => (
        <div key={status} className="space-y-2">
          <div className="flex items-center gap-2">
            <span className={cn("rounded-full border px-2.5 py-0.5 text-xs font-semibold", statusCfg.style[status])}>
              {statusCfg.label[status]}
            </span>
            <span className="text-xs text-muted-foreground">{rows.length}건</span>
          </div>
          <div className="space-y-1.5">
            {rows.map((p) => {
              const { done, total, current } = summarize(p.steps);
              const pct = total ? Math.round((done / total) * 100) : 0;
              const accent = current?.type === "SHIPPING" ? "bg-emerald-500" : "bg-blue-500";
              return (
                <div key={p.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md border p-3 text-sm">
                  <Link href={`/projects/${p.id}`} className="min-w-[140px] flex-1 font-medium hover:underline">{p.productName}</Link>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">현재단계</span>
                    <span className="font-medium">
                      {current ? (current.group !== current.name ? `${current.group} › ${current.name}` : current.name) : "-"}
                    </span>
                    {current?.staff && <span className="text-xs text-muted-foreground">· {current.staff}</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
                      <div className={cn("h-full rounded-full", accent)} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="tabular-nums text-xs text-muted-foreground">{done}/{total}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    주문 {fmtDate(p.orderDate)} · 완성예정 {fmtDate(p.expectedCompletionDate)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
