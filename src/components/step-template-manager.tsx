"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Plus, Check, X, Pencil } from "lucide-react";

type Tpl = { id: string; type: string; group: string; name: string; order: number; active: boolean };

function Section({ title, type, items, accent }: { title: string; type: string; items: Tpl[]; accent: string }) {
  const router = useRouter();
  const [newGroup, setNewGroup] = useState("");
  const [newName, setNewName] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  async function add() {
    if (!newName.trim()) return;
    const res = await fetch("/api/admin/steps", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, group: newGroup.trim() || newName.trim(), name: newName.trim() }),
    });
    if (!res.ok) { alert("추가 실패"); return; }
    setNewName(""); setNewGroup(""); router.refresh();
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

  const sorted = [...items].sort((x, y) => x.order - y.order);
  // group 단위로 묶기 (순서 보존)
  const groups: { group: string; rows: Tpl[] }[] = [];
  for (const t of sorted) {
    const g = groups.find((x) => x.group === t.group);
    if (g) g.rows.push(t); else groups.push({ group: t.group, rows: [t] });
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {groups.length === 0 && <p className="text-sm text-muted-foreground">단계가 없습니다.</p>}
        {groups.map(({ group, rows }) => (
          <div key={group} className="rounded-md border">
            <div className="border-b bg-muted/30 px-3 py-1.5 text-xs font-semibold text-muted-foreground">
              {group}{rows.length > 1 || rows[0].name !== group ? ` · ${rows.length}개 하위단계` : ""}
            </div>
            <div className="space-y-1 p-2">
              {rows.map((t) => (
                <div key={t.id} className={`flex items-center gap-2 rounded px-1.5 py-1 ${t.active ? "" : "opacity-50"}`}>
                  <span className={`h-2 w-2 shrink-0 rounded-full ${accent}`} />
                  {editId === t.id ? (
                    <>
                      <Input value={editName} className="h-7 flex-1 text-sm" onChange={(e) => setEditName(e.target.value)} />
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { patch(t.id, { name: editName }); setEditId(null); }}><Check className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditId(null)}><X className="h-4 w-4" /></Button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 text-sm">{t.name}</span>
                      <button onClick={() => patch(t.id, { active: !t.active })} className="rounded border px-2 py-0.5 text-xs text-muted-foreground hover:bg-accent">
                        {t.active ? "사용중" : "미사용"}
                      </button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditId(t.id); setEditName(t.name); }}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => remove(t.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
        <div className="flex items-center gap-2 pt-1">
          <Input value={newGroup} placeholder="그룹(2단계)" className="h-9 w-32" onChange={(e) => setNewGroup(e.target.value)} />
          <Input value={newName} placeholder="단계명(3단계)" className="h-9 flex-1" onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} />
          <Button onClick={add}><Plus className="h-4 w-4" /> 추가</Button>
        </div>
        <p className="text-xs text-muted-foreground">그룹을 비우면 단계명이 곧 그룹(단일 단계)이 됩니다. 같은 그룹명으로 추가하면 하위단계로 묶입니다.</p>
      </CardContent>
    </Card>
  );
}

export function StepTemplateManager({ production, shipping }: { production: Tpl[]; shipping: Tpl[] }) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Section title="제작일정 관리" type="PRODUCTION" items={production} accent="bg-blue-500" />
      <Section title="출고관리" type="SHIPPING" items={shipping} accent="bg-emerald-500" />
    </div>
  );
}
