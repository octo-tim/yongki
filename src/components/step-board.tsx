"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Check, ChevronDown, ChevronRight } from "lucide-react";

export type BoardStep = {
  id: string; type: string; group: string; name: string; order: number;
  done: boolean; doneAt: string | Date | null; staff: string | null;
};

const TYPE_TABS = [
  { key: "PRODUCTION", label: "제작일정 관리", accent: "blue" },
  { key: "SHIPPING", label: "출고관리", accent: "emerald" },
] as const;

const dInput = (v: string | Date | null) => (v ? new Date(v).toISOString().slice(0, 10) : "");
const dShow = (v: string | Date | null) => {
  if (!v) return "";
  const d = new Date(v);
  return `${String(d.getFullYear()).slice(2)}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
};

export function StepBoard({ projectId, steps }: { projectId: string; steps: BoardStep[] }) {
  const router = useRouter();
  const [tab, setTab] = useState<"PRODUCTION" | "SHIPPING">("PRODUCTION");
  const [busy, setBusy] = useState<string | null>(null);
  const [openGroup, setOpenGroup] = useState<string | null>("제작확인");

  async function patch(stepId: string, body: any) {
    setBusy(stepId);
    await fetch(`/api/projects/${projectId}/steps`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stepId, ...body }),
    });
    setBusy(null);
    router.refresh();
  }

  // 현재 탭의 그룹 구성
  const groups = useMemo(() => {
    const list = steps.filter((s) => s.type === tab).sort((a, b) => a.order - b.order);
    const map = new Map<string, BoardStep[]>();
    for (const s of list) {
      if (!map.has(s.group)) map.set(s.group, []);
      map.get(s.group)!.push(s);
    }
    return [...map.entries()];
  }, [steps, tab]);

  const accent = TYPE_TABS.find((t) => t.key === tab)!.accent;

  return (
    <div>
      {/* 1단계: 탭 */}
      <div className="mb-4 flex gap-2">
        {TYPE_TABS.map((t) => {
          const done = steps.filter((s) => s.type === t.key && s.done).length;
          const total = steps.filter((s) => s.type === t.key).length;
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={cn("flex-1 rounded-lg border px-4 py-3 text-left transition-colors",
                tab === t.key ? "border-foreground bg-accent" : "hover:bg-accent/50")}>
              <div className="text-sm font-semibold">{t.label}</div>
              <div className="mt-0.5 text-xs text-muted-foreground">{done} / {total} 완료</div>
            </button>
          );
        })}
      </div>

      {/* 2단계: 그룹 */}
      <div className="space-y-2">
        {groups.map(([group, children]) => {
          const isParent = children.length > 1 || children[0]?.name !== group;
          if (!isParent) {
            return <LeafRow key={group} step={children[0]} accent={accent} busy={busy} onPatch={patch} />;
          }
          const open = openGroup === group;
          const doneCnt = children.filter((c) => c.done).length;
          return (
            <div key={group} className="rounded-lg border">
              <button onClick={() => setOpenGroup(open ? null : group)}
                className="flex w-full items-center justify-between px-3 py-2.5 text-left">
                <span className="flex items-center gap-2 text-sm font-semibold">
                  {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  {group}
                </span>
                <span className="text-xs text-muted-foreground">{doneCnt} / {children.length}</span>
              </button>
              {open && (
                <div className="space-y-1.5 border-t bg-muted/20 p-2">
                  {/* 3단계: 하위 단계 */}
                  {children.map((c) => <LeafRow key={c.id} step={c} accent={accent} busy={busy} onPatch={patch} nested />)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LeafRow({ step, accent, busy, onPatch, nested }: {
  step: BoardStep; accent: string; busy: string | null;
  onPatch: (id: string, body: any) => void; nested?: boolean;
}) {
  const [staff, setStaff] = useState(step.staff ?? "");
  const accentCls = accent === "blue"
    ? "bg-blue-500 border-blue-500"
    : "bg-emerald-500 border-emerald-500";
  const tint = step.done ? (accent === "blue" ? "border-blue-200 bg-blue-50/40" : "border-emerald-200 bg-emerald-50/40") : "border-transparent bg-background";

  return (
    <div className={cn("flex items-center gap-2 rounded-md border px-2.5 py-2", tint, nested && "bg-white")}>
      <button
        onClick={() => onPatch(step.id, { done: !step.done })}
        disabled={busy === step.id}
        className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
          step.done ? `${accentCls} text-white` : "border-muted-foreground/30 text-transparent hover:border-muted-foreground")}>
        <Check className="h-3.5 w-3.5" />
      </button>
      <span className={cn("w-24 shrink-0 text-sm", step.done ? "font-medium" : "text-muted-foreground")}>{step.name}</span>
      <input type="date" value={dInput(step.doneAt)} disabled={busy === step.id}
        onChange={(e) => onPatch(step.id, { doneAt: e.target.value || null, done: !!e.target.value })}
        className="h-8 w-[140px] shrink-0 rounded border border-input bg-background px-2 text-xs" />
      <input type="text" value={staff} placeholder="직원" disabled={busy === step.id}
        onChange={(e) => setStaff(e.target.value)}
        onBlur={() => { if ((step.staff ?? "") !== staff) onPatch(step.id, { staff }); }}
        className="h-8 min-w-0 flex-1 rounded border border-input bg-background px-2 text-xs" />
      {step.done && step.doneAt && <span className="shrink-0 text-[11px] text-muted-foreground">{dShow(step.doneAt)}</span>}
    </div>
  );
}
