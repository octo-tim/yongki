import { STEP_ORDER } from "@/lib/steps";
import { CheckCircle2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

export function PortalProgress({ steps, currentStep }: { steps: { name: string; done: boolean; doneAt?: string | Date | null }[]; currentStep: string }) {
  const doneMap = new Map(steps.map((s) => [s.name, s]));
  const curIdx = STEP_ORDER.indexOf(currentStep);
  return (
    <div className="space-y-0.5">
      {STEP_ORDER.map((name, i) => {
        const s = doneMap.get(name);
        const done = !!s?.done;
        const isCurrent = i === curIdx;
        return (
          <div key={name} className={cn("flex items-center gap-3 rounded-md px-2 py-1.5", isCurrent && "bg-primary/5")}>
            {done ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" /> : <Circle className="h-4 w-4 shrink-0 text-muted-foreground/30" />}
            <span className={cn("flex-1 text-sm", done ? "text-foreground" : "text-muted-foreground", isCurrent && "font-semibold text-primary")}>{name}</span>
            {s?.doneAt && <span className="text-xs text-muted-foreground">{new Date(s.doneAt).toISOString().slice(0, 10)}</span>}
          </div>
        );
      })}
    </div>
  );
}
