"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { BADGE_COLORS, BADGE_COLOR_KEYS } from "@/lib/badge-colors";
import { cn } from "@/lib/utils";
import { ChevronUp, ChevronDown } from "lucide-react";

type Row = { key: string; label: string; color: string; sortOrder: number };

export function StatusSettingsManager({ rows: initial }: { rows: Row[] }) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([...initial].sort((a, b) => a.sortOrder - b.sortOrder));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function update(i: number, patch: Partial<Row>) {
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
    setSaved(false);
  }
  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= rows.length) return;
    setRows((rs) => {
      const next = [...rs];
      [next[i], next[j]] = [next[j], next[i]];
      return next.map((r, idx) => ({ ...r, sortOrder: idx }));
    });
    setSaved(false);
  }

  async function save() {
    setSaving(true); setSaved(false);
    const items = rows.map((r, idx) => ({ ...r, sortOrder: idx }));
    const res = await fetch("/api/admin/statuses", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });
    setSaving(false);
    if (res.ok) { setSaved(true); router.refresh(); }
    else alert("저장 실패");
  }

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        {rows.map((r, i) => (
          <div key={r.key} className="flex flex-wrap items-center gap-3 rounded-md border p-3">
            <div className="flex flex-col">
              <button onClick={() => move(i, -1)} disabled={i === 0} className="text-muted-foreground disabled:opacity-30"><ChevronUp className="h-4 w-4" /></button>
              <button onClick={() => move(i, 1)} disabled={i === rows.length - 1} className="text-muted-foreground disabled:opacity-30"><ChevronDown className="h-4 w-4" /></button>
            </div>
            <span className={cn("inline-flex rounded-full border px-2 py-0.5 text-xs font-medium", BADGE_COLORS[r.color])}>{r.label || r.key}</span>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">표시 이름</label>
              <Input value={r.label} className="w-40" onChange={(e) => update(i, { label: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">색상</label>
              <div className="flex flex-wrap gap-1">
                {BADGE_COLOR_KEYS.map((c) => (
                  <button key={c} onClick={() => update(i, { color: c })}
                    className={cn("h-6 w-6 rounded-full border-2", BADGE_COLORS[c], r.color === c ? "ring-2 ring-offset-1 ring-foreground" : "")}
                    title={c} aria-label={c} />
                ))}
              </div>
            </div>
            <span className="ml-auto text-xs text-muted-foreground">{r.key}</span>
          </div>
        ))}
        <div className="flex items-center gap-3 pt-2">
          <Button onClick={save} disabled={saving}>{saving ? "저장 중..." : "저장"}</Button>
          {saved && <span className="text-sm text-emerald-600">저장되었습니다.</span>}
          <p className="text-xs text-muted-foreground">상태 항목 자체(개수)는 자동계산 로직과 연결되어 추가/삭제할 수 없으며, 이름·색상·순서만 변경됩니다.</p>
        </div>
      </CardContent>
    </Card>
  );
}
