"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronUp, ChevronDown, Trash2, Plus, Check, X, Pencil } from "lucide-react";

type Tpl = { id: string; type: string; name: string; order: number; active: boolean };

function Section({ title, type, items, accent }: { title: string; type: string; items: Tpl[]; accent: string }) {
  const router = useRouter();
  const [newName, setNewName] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  async function add() {
    if (!newName.trim()) return;
    const res = await fetch("/api/admin/steps", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, name: newName.trim() }),
    });
    if (!res.ok) { alert("추가 실패"); return; }
    setNewName(""); router.refresh();
  }
  async function patch(id: string, body: any) {
    const res = await fetch(`/api/admin/steps/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    if (res.ok) router.refresh(); else alert("수정 실패");
  }
  async function remove(id: string) {
    if (!confirm("이 단계를 삭제하시겠습니까?")) return;
    const res = await fetch(`/api/admin/steps/${id}`, { method: "DELETE" });
    if (res.ok) router.refresh(); else alert("삭제 실패");
  }
  async function swap(a: Tpl, b: Tpl) {
    await fetch(`/api/admin/steps/${a.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ order: b.order }) });
    await fetch(`/api/admin/steps/${b.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ order: a.order }) });
    router.refresh();
  }

  const sorted = [...items].sort((x, y) => x.order - y.order);

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {sorted.length === 0 && <p className="text-sm text-muted-foreground">단계가 없습니다.</p>}
        {sorted.map((t, i) => (
          <div key={t.id} className={`flex items-center gap-2 rounded-md border p-2 ${t.active ? "" : "opacity-50"}`}>
            <div className="flex flex-col">
              <button onClick={() => i > 0 && swap(t, sorted[i - 1])} disabled={i === 0} className="text-muted-foreground disabled:opacity-30"><ChevronUp className="h-4 w-4" /></button>
              <button onClick={() => i < sorted.length - 1 && swap(t, sorted[i + 1])} disabled={i === sorted.length - 1} className="text-muted-foreground disabled:opacity-30"><ChevronDown className="h-4 w-4" /></button>
            </div>
            <span className={`h-2 w-2 shrink-0 rounded-full ${accent}`} />
            {editId === t.id ? (
              <>
                <Input value={editName} className="h-8 flex-1" onChange={(e) => setEditName(e.target.value)} />
                <Button size="icon" variant="ghost" onClick={() => { patch(t.id, { name: editName }); setEditId(null); }}><Check className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => setEditId(null)}><X className="h-4 w-4" /></Button>
              </>
            ) : (
              <>
                <span className="flex-1 text-sm">{t.name}</span>
                <button onClick={() => patch(t.id, { active: !t.active })} className="rounded border px-2 py-0.5 text-xs text-muted-foreground hover:bg-accent">
                  {t.active ? "사용중" : "미사용"}
                </button>
                <Button size="icon" variant="ghost" onClick={() => { setEditId(t.id); setEditName(t.name); }}><Pencil className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => remove(t.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </>
            )}
          </div>
        ))}
        <div className="flex items-center gap-2 pt-1">
          <Input value={newName} placeholder="새 단계 이름" className="h-9" onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} />
          <Button onClick={add}><Plus className="h-4 w-4" /> 추가</Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function StepTemplateManager({ production, shipping }: { production: Tpl[]; shipping: Tpl[] }) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Section title="제작 단계" type="PRODUCTION" items={production} accent="bg-blue-500" />
      <Section title="출고 단계" type="SHIPPING" items={shipping} accent="bg-emerald-500" />
    </div>
  );
}
