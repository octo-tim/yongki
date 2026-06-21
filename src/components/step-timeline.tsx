"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { STEP_ORDER } from "@/lib/steps";
import { cn } from "@/lib/utils";
import { Check, X } from "lucide-react";

type S = { name: string; doneAt: string | Date | null; staff: string | null; done: boolean };

function toInput(d: string | Date | null): string {
  if (!d) return "";
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? "" : dt.toLocaleDateString("en-CA");
}

export function StepTimeline({ projectId, current, steps }: { projectId: string; current?: string | null; steps: S[] }) {
  const byName = new Map(steps.map((s) => [s.name, s]));
  return (
    <div className="overflow-hidden rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
            <th className="px-3 py-2 font-semibold">단계</th>
            <th className="px-3 py-2 font-semibold">진행일</th>
            <th className="px-3 py-2 font-semibold">확인직원</th>
            <th className="w-28 px-3 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {STEP_ORDER.map((name, i) => (
            <StepRow key={name} projectId={projectId} index={i} name={name} s={byName.get(name)} isCur={current === name} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StepRow({ projectId, index, name, s, isCur }: { projectId: string; index: number; name: string; s?: S; isCur: boolean }) {
  const router = useRouter();
  const [date, setDate] = useState(toInput(s?.doneAt ?? null));
  const [busy, setBusy] = useState(false);
  const done = !!(s?.doneAt || s?.staff || s?.done);

  async function apply() {
    setBusy(true);
    const today = new Date().toLocaleDateString("en-CA");
    await fetch(`/api/projects/${projectId}/steps`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, doneAt: date || today }),
    });
    setBusy(false); router.refresh();
  }
  async function clear() {
    setBusy(true);
    await fetch(`/api/projects/${projectId}/steps`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, clear: true }),
    });
    setBusy(false); setDate(""); router.refresh();
  }

  return (
    <tr className={cn("border-b last:border-0", isCur && "bg-primary/5")}>
      <td className="px-3 py-2">
        <span className="flex items-center gap-2">
          <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
            done ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
            {done ? <Check className="h-3 w-3" /> : index + 1}
          </span>
          <span className={cn("font-medium", isCur && "text-primary")}>{name}</span>
          {isCur && <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">현재</span>}
        </span>
      </td>
      <td className="px-3 py-2">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
          className="h-8 rounded-md border border-input bg-background px-2 text-xs" />
      </td>
      <td className="px-3 py-2 text-muted-foreground">{s?.staff ?? "-"}</td>
      <td className="px-3 py-2">
        <div className="flex items-center justify-end gap-1.5">
          <button onClick={apply} disabled={busy}
            className="rounded-md bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground disabled:opacity-50">
            {busy ? "..." : "확인"}
          </button>
          {done && (
            <button onClick={clear} disabled={busy} title="삭제"
              className="rounded-md border px-1.5 py-1 text-muted-foreground transition-colors hover:text-destructive disabled:opacity-50">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
