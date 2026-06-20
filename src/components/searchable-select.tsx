"use client";
import { useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

type Opt = { id: string; name: string };

export function SearchableSelect({ options, value, onChange, placeholder = "검색...", className }: {
  options: Opt[]; value: string; onChange: (id: string) => void; placeholder?: string; className?: string;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const blurTimer = useRef<any>(null);
  const selected = options.find((o) => o.id === value);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    const base = t ? options.filter((o) => o.name.toLowerCase().includes(t)) : options;
    return base.slice(0, 30);
  }, [options, q]);

  return (
    <div className={cn("relative", className)}>
      <div className="flex items-center gap-1">
        <input
          value={open ? q : (selected?.name ?? "")}
          placeholder={selected ? selected.name : placeholder}
          onFocus={() => { setOpen(true); setQ(""); }}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onBlur={() => { blurTimer.current = setTimeout(() => setOpen(false), 150); }}
          className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
        />
        {selected && (
          <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { onChange(""); setQ(""); }}
            className="shrink-0 rounded p-1 hover:bg-accent"><X className="h-3.5 w-3.5 text-muted-foreground" /></button>
        )}
      </div>
      {open && (
        <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-md border bg-background shadow-md">
          {filtered.length === 0 && <li className="px-3 py-2 text-xs text-muted-foreground">결과 없음</li>}
          {filtered.map((o) => (
            <li key={o.id}>
              <button type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => { onChange(o.id); setOpen(false); setQ(""); blurTimer.current && clearTimeout(blurTimer.current); }}
                className={cn("block w-full px-3 py-1.5 text-left text-sm hover:bg-accent", o.id === value && "bg-accent")}>
                {o.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
