"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { STEP_ORDER } from "@/lib/steps";
import { cn } from "@/lib/utils";

export function StepSelect({ projectId, current, className, size = "md" }: {
  projectId: string; current?: string | null; className?: string; size?: "sm" | "md";
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [val, setVal] = useState(current ?? "");
  async function change(name: string) {
    if (!name || name === val) return;
    setVal(name); setBusy(true);
    await fetch(`/api/projects/${projectId}/steps`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }),
    });
    setBusy(false);
    router.refresh();
  }
  return (
    <select value={val} disabled={busy}
      onChange={(e) => change(e.target.value)}
      onClick={(e) => e.stopPropagation()}
      className={cn("rounded-full border bg-card px-2.5 font-medium outline-none focus:ring-2 focus:ring-ring disabled:opacity-50",
        size === "sm" ? "h-7 text-xs" : "h-9 text-sm", className)}>
      <option value="">단계 선택</option>
      {STEP_ORDER.map((s) => <option key={s} value={s}>{s}</option>)}
    </select>
  );
}
