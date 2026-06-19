"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Circle } from "lucide-react";
import { cn, fmtDate } from "@/lib/utils";

type Step = { id: string; name: string; order: number; done: boolean; doneAt: string | Date | null; type: string };

export function Timeline({ projectId, title, steps, accent }: {
  projectId: string; title: string; steps: Step[]; accent: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function toggle(step: Step) {
    setBusy(step.id);
    await fetch(`/api/projects/${projectId}/steps`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stepId: step.id, done: !step.done }),
    });
    setBusy(null);
    router.refresh();
  }

  async function setDate(step: Step, date: string) {
    setBusy(step.id);
    await fetch(`/api/projects/${projectId}/steps`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stepId: step.id, doneAt: date || null, done: !!date }),
    });
    setBusy(null);
    router.refresh();
  }

  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      <ol className="relative space-y-1">
        {steps.map((s, i) => (
          <li key={s.id} className="flex items-start gap-3">
            <div className="flex flex-col items-center">
              <button
                onClick={() => toggle(s)}
                disabled={busy === s.id}
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                  s.done ? `${accent} border-transparent text-white` : "border-muted-foreground/30 text-transparent hover:border-muted-foreground"
                )}
              >
                {s.done ? <Check className="h-4 w-4" /> : <Circle className="h-3 w-3" />}
              </button>
              {i < steps.length - 1 && <div className={cn("my-0.5 h-6 w-0.5", s.done ? accent : "bg-muted")} />}
            </div>
            <div className="flex flex-1 items-center justify-between pt-0.5">
              <span className={cn("text-sm", s.done ? "font-medium" : "text-muted-foreground")}>{s.name}</span>
              <input
                type="date"
                value={s.doneAt ? new Date(s.doneAt).toISOString().slice(0, 10) : ""}
                onChange={(e) => setDate(s, e.target.value)}
                className="h-7 rounded border border-input bg-background px-2 text-xs"
              />
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
