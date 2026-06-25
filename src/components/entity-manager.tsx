"use client";
import { useState, Fragment } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pencil, Trash2, Plus, ChevronRight, ChevronDown } from "lucide-react";
import { STEP_ORDER } from "@/lib/steps";
import { cn } from "@/lib/utils";

type Entity = { id: string; [k: string]: any };
type FieldDef = { key: string; label: string; placeholder?: string; primary?: boolean; textarea?: boolean };

const SHIPPING_STEPS = new Set(["창고입고", "검품", "출고", "한국도착", "고객인도"]);
function currentStepName(p: { status?: string | null; steps?: { name: string; done: boolean }[] }) {
  if (p.status && STEP_ORDER.includes(p.status)) return p.status;
  const done = new Set((p.steps ?? []).filter((s) => s.done).map((s) => s.name));
  for (let i = STEP_ORDER.length - 1; i >= 0; i--) if (done.has(STEP_ORDER[i])) return STEP_ORDER[i];
  return "";
}

export function EntityManager({ endpoint, fields, rows, countKey, linkBase, showCode }: {
  endpoint: string; fields: FieldDef[]; rows: Entity[]; countKey?: string; linkBase?: string; showCode?: boolean;
}) {
  const router = useRouter();
  const empty = Object.fromEntries(fields.map((f) => [f.key, ""]));
  const [form, setForm] = useState<Record<string, string>>(empty);
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggle = (id: string) => setExpanded((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  // 표에 보일 주요 컬럼 (primary 표시, 없으면 앞 4개)
  const primary = fields.filter((f) => f.primary);
  const cols = primary.length ? primary : fields.slice(0, 4);

  async function add() {
    if (!form[fields[0].key]?.trim()) return;
    await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setForm(empty); setAdding(false); router.refresh();
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
      <div className="flex justify-end">
        <Button onClick={() => { setAdding((a) => !a); setForm(empty); }}><Plus className="h-4 w-4" /> 추가</Button>
      </div>

      {adding && (
        <Card>
          <CardContent className="p-4">
            <FieldGrid fields={fields} values={form} onChange={(k, v) => setForm((s) => ({ ...s, [k]: v }))} />
            <div className="mt-3 flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setAdding(false)}>취소</Button>
              <Button size="sm" onClick={add}>등록</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {editId && (
        <Card className="border-primary/40">
          <CardContent className="p-4">
            <p className="mb-3 text-sm font-semibold">정보 수정</p>
            <FieldGrid fields={fields} values={editForm} onChange={(k, v) => setEditForm((s) => ({ ...s, [k]: v }))} />
            <div className="mt-3 flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setEditId(null)}>취소</Button>
              <Button size="sm" onClick={() => save(editId)}>저장</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              {showCode && <TableHead className="w-14">번호</TableHead>}
              {cols.map((f) => <TableHead key={f.key}>{f.label}</TableHead>)}
              {countKey && <TableHead className="text-right">프로젝트</TableHead>}
              <TableHead className="w-20 text-right">관리</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && <TableRow><TableCell colSpan={cols.length + 2 + (showCode ? 1 : 0)} className="py-8 text-center text-muted-foreground">데이터가 없습니다.</TableCell></TableRow>}
            {rows.map((r) => {
              const projects: any[] = r.projects ?? [];
              const count = r._count?.[countKey ?? ""] ?? projects.length;
              const canExpand = !!countKey && projects.length > 0;
              const isOpen = expanded.has(r.id);
              return (
                <Fragment key={r.id}>
                  <TableRow className={isOpen ? "border-b-0" : ""}>
                    {showCode && <TableCell className="text-sm font-semibold text-muted-foreground">{r.code ?? "-"}</TableCell>}
                    {cols.map((f, fi) => (
                      <TableCell key={f.key} className={fi === 0 ? "font-medium" : "text-sm text-muted-foreground"}>
                        {fi === 0 && linkBase
                          ? <Link href={`${linkBase}/${r.id}`} className="text-primary hover:underline">{r[f.key] ?? "-"}</Link>
                          : (r[f.key] || "-")}
                      </TableCell>
                    ))}
                    {countKey && (
                      <TableCell className="text-right">
                        {canExpand ? (
                          <button onClick={() => toggle(r.id)} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-accent hover:text-foreground">
                            {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                            {count}건
                          </button>
                        ) : <span className="text-muted-foreground">{count}</span>}
                      </TableCell>
                    )}
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => { setEditId(r.id); setAdding(false); setEditForm(Object.fromEntries(fields.map((f) => [f.key, r[f.key] ?? ""]))); }}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => remove(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  {isOpen && (
                    <TableRow className="bg-muted/20 hover:bg-muted/20">
                      <TableCell colSpan={cols.length + 2 + (showCode ? 1 : 0)} className="py-2">
                        <div className="space-y-1">
                          {projects.map((p) => {
                            const cur = currentStepName(p);
                            return (
                              <div key={p.id} className="flex items-center gap-2 rounded-md px-2 py-1 text-sm">
                                <span className={cn("rounded-full border px-2 py-0.5 text-xs font-semibold",
                                  cur && SHIPPING_STEPS.has(cur) ? "border-emerald-200 bg-emerald-50 text-emerald-700" : cur ? "border-blue-200 bg-blue-50 text-blue-700" : "text-muted-foreground")}>
                                  {cur || "단계 미정"}
                                </span>
                                <Link href={`/projects/${p.id}`} className="font-medium hover:underline">{p.productName}</Link>
                              </div>
                            );
                          })}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function FieldGrid({ fields, values, onChange }: {
  fields: FieldDef[]; values: Record<string, string>; onChange: (k: string, v: string) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {fields.map((f) => (
        <div key={f.key} className={f.textarea ? "sm:col-span-2 lg:col-span-3" : ""}>
          <label className="mb-1 block text-xs text-muted-foreground">{f.label}</label>
          {f.textarea
            ? <Textarea value={values[f.key] ?? ""} placeholder={f.placeholder} rows={2} onChange={(e) => onChange(f.key, e.target.value)} />
            : <Input value={values[f.key] ?? ""} placeholder={f.placeholder} onChange={(e) => onChange(f.key, e.target.value)} />}
        </div>
      ))}
    </div>
  );
}
