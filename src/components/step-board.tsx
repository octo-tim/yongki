"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export type BoardStep = {
  id: string; type: string; group: string; name: string; order: number;
  done: boolean; doneAt: string | Date | null; staff: string | null;
};

const dInput = (v: string | Date | null) => (v ? new Date(v).toISOString().slice(0, 10) : "");

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
    <div className="space-y-6">
      <StepTable title="제작일정 관리" steps={prod} accent="blue" onPatch={patch} busy={busy} />
      <StepTable title="출고관리" steps={ship} accent="emerald" onPatch={patch} busy={busy} />
    </div>
  );
}

function StepTable({ title, steps, accent, onPatch, busy }: {
  title: string; steps: BoardStep[]; accent: "blue" | "emerald";
  onPatch: (id: string, body: any) => void; busy: string | null;
}) {
  // 2단계 그룹 묶기 (순서 보존)
  const groups: { group: string; rows: BoardStep[]; multi: boolean }[] = [];
  for (const s of steps) {
    let g = groups.find((x) => x.group === s.group);
    if (!g) { g = { group: s.group, rows: [], multi: false }; groups.push(g); }
    g.rows.push(s);
  }
  for (const g of groups) g.multi = g.rows.length > 1 || g.rows[0].name !== g.group;
  const hasMulti = groups.some((g) => g.multi);

  const headBg = accent === "blue" ? "bg-blue-700 text-white" : "bg-emerald-700 text-white";
  const subBg = accent === "blue" ? "bg-blue-600 text-white" : "bg-emerald-600 text-white";
  const fillBg = accent === "blue" ? "bg-blue-50" : "bg-emerald-50";

  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full border-collapse text-center text-xs">
          <thead>
            <tr>
              <th rowSpan={hasMulti ? 2 : 1} className={cn("sticky left-0 z-10 border border-white/20 px-2 py-1.5 font-semibold", headBg)}>구분</th>
              {groups.map((g) =>
                g.multi ? (
                  <th key={g.group} colSpan={g.rows.length} className={cn("border border-white/20 px-2 py-1.5 font-semibold", headBg)}>{g.group}</th>
                ) : (
                  <th key={g.group} rowSpan={hasMulti ? 2 : 1} className={cn("min-w-[120px] border border-white/20 px-2 py-1.5 font-semibold", headBg)}>{g.group}</th>
                )
              )}
            </tr>
            {hasMulti && (
              <tr>
                {groups.filter((g) => g.multi).flatMap((g) => g.rows).map((r) => (
                  <th key={r.id} className={cn("min-w-[110px] border border-white/20 px-2 py-1.5 font-medium", subBg)}>{r.name}</th>
                ))}
              </tr>
            )}
          </thead>
          <tbody>
            {/* 일자 행 */}
            <tr>
              <th className="sticky left-0 z-10 border bg-muted px-2 py-1 font-semibold text-muted-foreground">일자</th>
              {steps.map((s) => (
                <td key={s.id} className={cn("border p-0", s.doneAt && fillBg)}>
                  <input type="date" value={dInput(s.doneAt)} disabled={busy === s.id}
                    onChange={(e) => onPatch(s.id, { doneAt: e.target.value || null, done: !!e.target.value })}
                    className="w-full min-w-[110px] bg-transparent px-1 py-1.5 text-center text-xs outline-none" />
                </td>
              ))}
            </tr>
            {/* 직원 행 */}
            <tr>
              <th className="sticky left-0 z-10 border bg-muted px-2 py-1 font-semibold text-muted-foreground">직원</th>
              {steps.map((s) => (
                <StaffCell key={s.id} step={s} fillBg={fillBg} busy={busy === s.id} onPatch={onPatch} />
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
    <td className={cn("border p-0", step.staff && fillBg)}>
      <input type="text" value={val} placeholder="-" disabled={busy}
        onChange={(e) => setVal(e.target.value)}
        onBlur={() => { if ((step.staff ?? "") !== val) onPatch(step.id, { staff: val }); }}
        className="w-full min-w-[110px] bg-transparent px-1 py-1.5 text-center text-xs outline-none placeholder:text-muted-foreground/40" />
    </td>
  );
}
