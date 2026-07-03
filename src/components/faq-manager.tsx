"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, ChevronDown, HelpCircle, Pencil, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";

type Item = { id: string; question: string; answer: string; category: string | null; createdAt: string; author?: { name: string } | null };

export function FaqManager({ items }: { items: Item[] }) {
  const router = useRouter();
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);
  const [q, setQ] = useState(""); const [a, setA] = useState(""); const [cat, setCat] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [eq, setEq] = useState(""); const [ea, setEa] = useState("");
  const [query, setQuery] = useState("");

  const cats = Array.from(new Set(items.map((i) => i.category).filter(Boolean))) as string[];
  const [catF, setCatF] = useState("all");
  const visible = items.filter((i) => {
    if (catF !== "all" && i.category !== catF) return false;
    if (!query.trim()) return true;
    const s = query.trim().toLowerCase();
    return i.question.toLowerCase().includes(s) || i.answer.toLowerCase().includes(s);
  });

  function toggle(id: string) { setOpen((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; }); }

  async function submit() {
    if (!q.trim() || !a.trim()) return;
    const res = await fetch("/api/faq", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: q, answer: a, category: cat || null }) });
    if (res.ok) { setQ(""); setA(""); setCat(""); setAdding(false); router.refresh(); }
  }
  async function saveEdit(id: string) {
    const res = await fetch(`/api/faq/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: eq, answer: ea }) });
    if (res.ok) { setEditing(null); router.refresh(); }
  }
  async function remove(id: string) {
    if (!confirm("삭제하시겠습니까?")) return;
    const res = await fetch(`/api/faq/${id}`, { method: "DELETE" });
    if (res.ok) router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input placeholder="질문/답변 검색" value={query} onChange={(e) => setQuery(e.target.value)} className="h-9 w-56" />
        <div className="flex flex-wrap gap-1.5">
          <button onClick={() => setCatF("all")} className={cn("rounded-full border px-3 py-1 text-xs", catF === "all" ? "bg-primary text-primary-foreground" : "bg-background")}>전체</button>
          {cats.map((c) => (
            <button key={c} onClick={() => setCatF(c)} className={cn("rounded-full border px-3 py-1 text-xs", catF === c ? "bg-primary text-primary-foreground" : "bg-background")}>{c}</button>
          ))}
        </div>
        <div className="flex-1" />
        <Button size="sm" onClick={() => setAdding((v) => !v)}><Plus className="mr-1 h-4 w-4" />질문 추가</Button>
      </div>

      {adding && (
        <div className="space-y-2 rounded-md border bg-muted/30 p-3">
          <Input placeholder="구분 (선택, 예: 결재/배송/제작)" value={cat} onChange={(e) => setCat(e.target.value)} className="h-9" />
          <Input placeholder="질문" value={q} onChange={(e) => setQ(e.target.value)} className="h-9" />
          <Textarea placeholder="답변" value={a} onChange={(e) => setA(e.target.value)} rows={3} />
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={() => setAdding(false)}>취소</Button>
            <Button size="sm" onClick={submit}>등록</Button>
          </div>
        </div>
      )}

      {visible.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
          <HelpCircle className="h-8 w-8 opacity-40" />
          <p className="text-sm">등록된 질문이 없습니다.</p>
        </div>
      )}

      <div className="divide-y rounded-md border">
        {visible.map((it) => {
          const isOpen = open.has(it.id);
          const isEditing = editing === it.id;
          return (
            <div key={it.id}>
              <button onClick={() => toggle(it.id)} className="flex w-full items-center gap-2 px-3 py-2.5 text-left hover:bg-accent/50">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">Q</span>
                <span className="flex-1 text-sm font-medium">{it.question}</span>
                {it.category && <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">{it.category}</span>}
                <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
              </button>
              {isOpen && (
                <div className="bg-muted/20 px-3 pb-3">
                  <div className="flex gap-2 pl-7">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">A</span>
                    {isEditing ? (
                      <div className="flex-1 space-y-2">
                        <Input value={eq} onChange={(e) => setEq(e.target.value)} className="h-8" />
                        <Textarea value={ea} onChange={(e) => setEa(e.target.value)} rows={3} />
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => setEditing(null)}><X className="h-3.5 w-3.5" /></Button>
                          <Button size="sm" onClick={() => saveEdit(it.id)}><Check className="h-3.5 w-3.5" /></Button>
                        </div>
                      </div>
                    ) : (
                      <p className="flex-1 whitespace-pre-wrap pt-0.5 text-sm text-muted-foreground">{it.answer}</p>
                    )}
                  </div>
                  {!isEditing && (
                    <div className="mt-2 flex items-center justify-end gap-1 pl-7">
                      <span className="mr-auto text-[11px] text-muted-foreground">{it.author?.name ?? ""}</span>
                      <button onClick={() => { setEditing(it.id); setEq(it.question); setEa(it.answer); }} className="rounded p-1 text-muted-foreground hover:bg-accent"><Pencil className="h-3.5 w-3.5" /></button>
                      <button onClick={() => remove(it.id)} className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
