"use client";
import { useState } from "react";
import { cn } from "@/lib/utils";

export type AggRow = { key: string; count: number; quantity: number; done: number; inProgress: number };
type Dim = { key: string; label: string };

export function AggregateTable({ data, dims }: { data: Record<string, AggRow[]>; dims: Dim[] }) {
  const [dim, setDim] = useState(dims[0]?.key ?? "");
  const rows = data[dim] ?? [];
  const totals = rows.reduce(
    (a, r) => ({ count: a.count + r.count, quantity: a.quantity + r.quantity, done: a.done + r.done, inProgress: a.inProgress + r.inProgress }),
    { count: 0, quantity: 0, done: 0, inProgress: 0 }
  );
  const dimLabel = dims.find((d) => d.key === dim)?.label ?? "기준";

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">집계기준</span>
        <select value={dim} onChange={(e) => setDim(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm">
          {dims.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}
        </select>
      </div>
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-left">
              <th className="px-3 py-2 font-semibold">{dimLabel}</th>
              <th className="px-3 py-2 text-right font-semibold">프로젝트 수</th>
              <th className="px-3 py-2 text-right font-semibold">총 수량</th>
              <th className="px-3 py-2 text-right font-semibold">완료</th>
              <th className="px-3 py-2 text-right font-semibold">진행중</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={5} className="py-6 text-center text-muted-foreground">데이터가 없습니다.</td></tr>
            )}
            {rows.map((r, i) => (
              <tr key={r.key} className={cn("border-b last:border-0", i % 2 ? "bg-muted/20" : "")}>
                <td className="px-3 py-2 font-medium">{r.key}</td>
                <td className="px-3 py-2 text-right tabular-nums">{r.count}</td>
                <td className="px-3 py-2 text-right tabular-nums">{r.quantity.toLocaleString()}</td>
                <td className="px-3 py-2 text-right tabular-nums text-emerald-700">{r.done}</td>
                <td className="px-3 py-2 text-right tabular-nums text-blue-700">{r.inProgress}</td>
              </tr>
            ))}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr className="border-t-2 bg-muted/40 font-semibold">
                <td className="px-3 py-2">합계</td>
                <td className="px-3 py-2 text-right tabular-nums">{totals.count}</td>
                <td className="px-3 py-2 text-right tabular-nums">{totals.quantity.toLocaleString()}</td>
                <td className="px-3 py-2 text-right tabular-nums">{totals.done}</td>
                <td className="px-3 py-2 text-right tabular-nums">{totals.inProgress}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
