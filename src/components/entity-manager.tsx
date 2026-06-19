"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pencil, Trash2, X, Check } from "lucide-react";

type Entity = { id: string; [k: string]: any };
type FieldDef = { key: string; label: string; placeholder?: string };

export function EntityManager({ endpoint, fields, rows, countKey, linkBase }: {
  endpoint: string; fields: FieldDef[]; rows: Entity[]; countKey?: string; linkBase?: string;
}) {
  const router = useRouter();
  const empty = Object.fromEntries(fields.map((f) => [f.key, ""]));
  const [form, setForm] = useState<Record<string, string>>(empty);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Record<string, string>>({});

  async function add() {
    if (!form[fields[0].key]?.trim()) return;
    await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setForm(empty); router.refresh();
  }
  async function save(id: string) {
    await fetch(`${endpoint}/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editForm) });
    setEditId(null); router.refresh();
  }
  async function remove(id: string) {
    if (!confirm("삭제하시겠습니까?")) return;
    const res = await fetch(`${endpoint}/${id}`, { method: "DELETE" });
    if (!res.ok) { const e = await res.json(); alert(e.error ?? "삭제 실패"); return; }
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-wrap items-end gap-2 p-4">
          {fields.map((f) => (
            <div key={f.key} className="space-y-1">
              <label className="text-xs text-muted-foreground">{f.label}</label>
              <Input value={form[f.key] ?? ""} placeholder={f.placeholder}
                onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))} className="w-44" />
            </div>
          ))}
          <Button onClick={add}>추가</Button>
        </CardContent>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              {fields.map((f) => <TableHead key={f.key}>{f.label}</TableHead>)}
              {countKey && <TableHead className="text-right">프로젝트</TableHead>}
              <TableHead className="w-24 text-right">관리</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && <TableRow><TableCell colSpan={fields.length + 2} className="py-8 text-center text-muted-foreground">데이터가 없습니다.</TableCell></TableRow>}
            {rows.map((r) => (
              <TableRow key={r.id}>
                {fields.map((f, fi) => (
                  <TableCell key={f.key}>
                    {editId === r.id
                      ? <Input value={editForm[f.key] ?? ""} onChange={(e) => setEditForm((s) => ({ ...s, [f.key]: e.target.value }))} className="h-8 w-40" />
                      : (fi === 0 && linkBase
                          ? <Link href={`${linkBase}/${r.id}`} className="font-medium text-primary hover:underline">{r[f.key] ?? "-"}</Link>
                          : (r[f.key] ?? "-"))}
                  </TableCell>
                ))}
                {countKey && <TableCell className="text-right text-muted-foreground">{r._count?.[countKey] ?? 0}</TableCell>}
                <TableCell className="text-right">
                  {editId === r.id ? (
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" onClick={() => save(r.id)}><Check className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => setEditId(null)}><X className="h-4 w-4" /></Button>
                    </div>
                  ) : (
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" onClick={() => { setEditId(r.id); setEditForm(Object.fromEntries(fields.map((f) => [f.key, r[f.key] ?? ""]))); }}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => remove(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
