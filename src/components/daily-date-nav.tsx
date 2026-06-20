"use client";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

export function DailyDateNav({ value, param = "date" }: { value: string; param?: string }) {
  const router = useRouter();
  const sp = useSearchParams();
  const pathname = usePathname();

  function go(v: string) {
    const params = new URLSearchParams(sp.toString());
    params.set(param, v);
    router.push(`${pathname}?${params.toString()}`);
  }
  function shift(days: number) {
    const d = new Date(`${value}T00:00:00.000Z`);
    d.setUTCDate(d.getUTCDate() + days);
    go(d.toISOString().slice(0, 10));
  }
  return (
    <div className="flex items-center gap-1">
      <button onClick={() => shift(-1)} className="rounded-md border px-2 py-1.5 text-sm hover:bg-accent">‹</button>
      <input type="date" value={value} onChange={(e) => e.target.value && go(e.target.value)}
        className="h-9 rounded-md border border-input bg-background px-3 text-sm" />
      <button onClick={() => shift(1)} className="rounded-md border px-2 py-1.5 text-sm hover:bg-accent">›</button>
    </div>
  );
}
