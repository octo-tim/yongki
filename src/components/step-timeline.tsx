"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { STEP_ORDER } from "@/lib/steps";
import { cn, fmtDate } from "@/lib/utils";
import { Check } from "lucide-react";

type S = { name: string; doneAt: string | Date | null; staff: string | null; done: boolean };

export function StepTimeline({ projectId, current, steps }: { projectId: string; current?: string | null; steps: S[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const byName = new Map(steps.map((s) => [s.name, s]));

  async function setStep(name: string) {
    setBusy(name);
    await fetch(`/api/projects/${projectId}/steps`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }),
    });
    setBusy(null);
    router.refresh();
  }

  return (
    <div className="overflow-hidden rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
            <th className="px-3 py-2 font-semibold">단계</th>
            <th className="px-3 py-2 font-semibold">진행일</th>
            <th className="px-3 py-2 font-semibold">확인직원</th>
            <th className="w-24 px-3 py-2 text-right"></th>
          </tr>
        </thead>
        <tbody>
          {STEP_ORDER.map((name, i) => {
            const s = byName.get(name);
            const isCur = current === name;
            const done = !!(s?.doneAt || s?.staff || s?.done);
            return (
              <tr key={name} className={cn("border-b last:border-0", isCur ? "bg-primary/5" : "")}>
                <td className="px-3 py-2">
                  <span className="flex items-center gap-2">
                    <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                      done ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                      {done ? <Check className="h-3 w-3" /> : i + 1}
                    </span>
                    <span className={cn("font-medium", isCur && "text-primary")}>{name}</span>
                    {isCur && <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">현재</span>}
                  </span>
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{s?.doneAt ? fmtDate(s.doneAt) : "-"}</td>
                <td className="px-3 py-2 text-muted-foreground">{s?.staff ?? "-"}</td>
                <td className="px-3 py-2 text-right">
                  <button onClick={() => setStep(name)} disabled={busy === name}
                    className={cn("rounded-full border px-2 py-0.5 text-xs font-medium transition-colors disabled:opacity-50",
                      isCur ? "border-primary text-primary" : "hover:bg-accent")}>
                    {busy === name ? "..." : isCur ? "현재" : "이 단계로"}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
