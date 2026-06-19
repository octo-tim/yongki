"use client";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function DateNav({ date, today }: { date: string; today: string }) {
  const router = useRouter();
  const go = (d: string) => router.push(`/dashboard?date=${d}`);

  function shift(days: number) {
    const [y, m, dd] = date.split("-").map(Number);
    const dt = new Date(Date.UTC(y, m - 1, dd));
    dt.setUTCDate(dt.getUTCDate() + days);
    go(dt.toISOString().slice(0, 10));
  }

  return (
    <div className="flex items-center gap-1">
      <button onClick={() => shift(-1)} className="flex h-8 w-8 items-center justify-center rounded-md border hover:bg-accent" aria-label="이전 날짜">
        <ChevronLeft className="h-4 w-4" />
      </button>
      <input
        type="date"
        value={date}
        onChange={(e) => e.target.value && go(e.target.value)}
        className="h-8 rounded-md border border-input bg-background px-2 text-sm"
      />
      <button onClick={() => shift(1)} className="flex h-8 w-8 items-center justify-center rounded-md border hover:bg-accent" aria-label="다음 날짜">
        <ChevronRight className="h-4 w-4" />
      </button>
      {date !== today && (
        <button onClick={() => go(today)} className="h-8 rounded-md border px-2 text-xs font-medium hover:bg-accent">
          오늘
        </button>
      )}
    </div>
  );
}
