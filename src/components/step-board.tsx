"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export type BoardStep = {
  id: string; type: string; group: string; name: string; order: number;
  done: boolean; doneAt: string | Date | null; staff: string | null;
};

const dInput = (v: string | Date | null) => (v ? new Date(v).toISOString().slice(0, 10) : "");

// 색상 팔레트 (Tailwind JIT용 리터럴 클래스)
const ACCENTS = {
  indigo: {
    topbar: "bg-indigo-500",
    head: "bg-indigo-600 text-white border-indigo-500/40",
    sub: "bg-indigo-500 text-white border-indigo-400/40",
    label: "bg-indigo-50 text-indigo-700",
    fill: "bg-indigo-50",
    dateText: "text-indigo-700 font-medium",
    dot: "bg-indigo-500",
    bar: "bg-indigo-500",
    pill: "bg-indigo-100 text-indigo-700",
  },
  teal: {
    topbar: "bg-teal-500",
    head: "bg-teal-600 text-white border-teal-500/40",
    sub: "bg-teal-500 text-white border-teal-400/40",
    label: "bg-teal-50 text-teal-700",
    fill: "bg-teal-50",
    dateText: "text-teal-700 font-medium",
    dot: "bg-teal-500",
    bar: "bg-teal-500",
    pill: "bg-teal-100 text-teal-700",
  },
} as const;
type AccentKey = keyof typeof ACCENTS;

export function StepBoard({ projectId, steps }: { projectId: string; steps: BoardStep[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function patch(stepId: string, body: any) {
    setBusy(stepId);
    await fetch(`/api/projects/${projectId}/steps`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stepId, ...body }),
    });
    setBusy(null);
    router.refresh();
  }

  const prod = steps.filter((s) => s.type === "PRODUCTION").sort((a, b) => a.order - b.order);
  const ship = steps.filter((s) => s.type === "SHIPPING").sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-5">
      <StepTable title="제작일정 관리" steps={prod} accent="indigo" onPatch={patch} busy={busy} />
      <StepTable title="출고관리" steps={ship} accent="teal" onPatch={patch} busy={busy} />
    </div>
  );
}

function StepTable({ title, steps, accent, onPatch, busy }: {
  title: string; steps: BoardStep[]; accent: AccentKey;
  onPatch: (id: string, body: any) => void; busy: string | null;
}) {
  const c = ACCENTS[accent];

  // 2단계 그룹 묶기 (순서 보존)
  const groups: { group: string; rows: BoardStep[]; multi: boolean }[] = [];
  for (const s of steps) {
    let g = groups.find((x) => x.group === s.group);
    if (!g) { g = { group: s.group, rows: [], multi: false }; groups.push(g); }
    g.rows.push(s);
  }
  for (const g of groups) g.multi = g.rows.length > 1 || g.rows[0].name !== g.group;
  const hasMulti = groups.some((g) => g.multi);

  const done = steps.filter((s) => s.doneAt || s.staff).length;
  const total = steps.length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 shadow-sm">
      <div className={cn("h-1 w-full", c.topbar)} />
      {/* 헤더바 */}
      <div className="flex items-center justify-between gap-3 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className={cn("h-2.5 w-2.5 rounded-full", c.dot)} />
          <h3 className="text-sm font-semibold">{title}</h3>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
            <div className={cn("h-full rounded-full", c.bar)} style={{ width: `${pct}%` }} />
          </div>
          <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", c.pill)}>{done}/{total}</span>
        </div>
      </div>

      <div className="overflow-x-auto border-t border-slate-200">
        <table className="w-full border-collapse text-center text-xs">
          <thead>
            <tr>
              <th rowSpan={hasMulti ? 2 : 1} className={cn("sticky left-0 z-10 border px-2 py-2 font-semibold", c.head)}>구분</th>
              {groups.map((g) =>
                g.multi ? (
                  <th key={g.group} colSpan={g.rows.length} className={cn("border px-2 py-2 font-semibold", c.head)}>{g.group}</th>
                ) : (
                  <th key={g.group} rowSpan={hasMulti ? 2 : 1} className={cn("min-w-[120px] border px-2 py-2 font-semibold", c.head)}>{g.group}</th>
                )
              )}
            </tr>
            {hasMulti && (
              <tr>
                {groups.filter((g) => g.multi).flatMap((g) => g.rows).map((r) => (
                  <th key={r.id} className={cn("min-w-[110px] border px-2 py-1.5 font-medium", c.sub)}>{r.name}</th>
                ))}
              </tr>
            )}
          </thead>
          <tbody>
            {/* 일자 행 */}
            <tr>
              <th className={cn("sticky left-0 z-10 border border-slate-200 px-2 py-1 text-xs font-semibold", c.label)}>일자</th>
              {steps.map((s) => (
                <td key={s.id} className={cn("border border-slate-200 p-0 transition-colors", s.doneAt && c.fill)}>
                  <input type="date" value={dInput(s.doneAt)} disabled={busy === s.id}
                    onChange={(e) => onPatch(s.id, { doneAt: e.target.value || null, done: !!e.target.value })}
                    className={cn("w-full min-w-[110px] bg-transparent px-1 py-1.5 text-center text-xs outline-none", s.doneAt && c.dateText)} />
                </td>
              ))}
            </tr>
            {/* 직원 행 */}
            <tr>
              <th className={cn("sticky left-0 z-10 border border-slate-200 px-2 py-1 text-xs font-semibold", c.label)}>확인직원</th>
              {steps.map((s) => (
                <StaffCell key={s.id} step={s} fillBg={c.fill} busy={busy === s.id} onPatch={onPatch} />
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StaffCell({ step, fillBg, busy, onPatch }: {
  step: BoardStep; fillBg: string; busy: boolean; onPatch: (id: string, body: any) => void;
}) {
  const [val, setVal] = useState(step.staff ?? "");
  return (
    <td className={cn("border border-slate-200 p-0 transition-colors", step.staff && fillBg)}>
      <input type="text" value={val} placeholder="-" disabled={busy}
        onChange={(e) => setVal(e.target.value)}
        onBlur={() => { if ((step.staff ?? "") !== val) onPatch(step.id, { staff: val }); }}
        className="w-full min-w-[110px] bg-transparent px-1 py-1.5 text-center text-xs outline-none placeholder:text-muted-foreground/40" />
    </td>
  );
}
