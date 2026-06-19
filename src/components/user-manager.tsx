"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pencil, Trash2, X, Check } from "lucide-react";

type Row = { id: string; email: string; name: string; role: string; createdAt: string };

const roleLabel = (r: string) => (r === "ADMIN" ? "관리자" : "직원");
const selectCls =
  "h-9 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function UserManager({ rows, currentUserId }: { rows: Row[]; currentUserId: string }) {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", name: "", password: "", role: "STAFF" });
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ email: "", name: "", role: "STAFF", password: "" });

  async function add() {
    if (!form.email.trim() || !form.name.trim() || !form.password) {
      alert("아이디·이름·비밀번호는 필수입니다.");
      return;
    }
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!res.ok) {
      const e = await res.json();
      alert(e.error ?? "추가 실패");
      return;
    }
    setForm({ email: "", name: "", password: "", role: "STAFF" });
    router.refresh();
  }

  function startEdit(r: Row) {
    setEditId(r.id);
    setEditForm({ email: r.email, name: r.name, role: r.role, password: "" });
  }

  async function save(id: string) {
    const res = await fetch(`/api/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    if (!res.ok) {
      const e = await res.json();
      alert(e.error ?? "저장 실패");
      return;
    }
    setEditId(null);
    router.refresh();
  }

  async function remove(id: string) {
    if (!confirm("이 사용자를 삭제하시겠습니까?")) return;
    const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const e = await res.json();
      alert(e.error ?? "삭제 실패");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-wrap items-end gap-2 p-4">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">아이디</label>
            <Input value={form.email} placeholder="로그인 아이디" className="w-40"
              onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">이름</label>
            <Input value={form.name} className="w-32"
              onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">비밀번호</label>
            <Input type="password" value={form.password} className="w-36"
              onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">권한</label>
            <select value={form.role} className={selectCls}
              onChange={(e) => setForm((s) => ({ ...s, role: e.target.value }))}>
              <option value="STAFF">직원</option>
              <option value="ADMIN">관리자</option>
            </select>
          </div>
          <Button onClick={add}>추가</Button>
        </CardContent>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>아이디</TableHead>
              <TableHead>이름</TableHead>
              <TableHead>권한</TableHead>
              <TableHead>비밀번호</TableHead>
              <TableHead>가입일</TableHead>
              <TableHead className="w-24 text-right">관리</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">사용자가 없습니다.</TableCell></TableRow>
            )}
            {rows.map((r) => {
              const editing = editId === r.id;
              return (
                <TableRow key={r.id}>
                  <TableCell>
                    {editing
                      ? <Input value={editForm.email} className="h-8 w-36" onChange={(e) => setEditForm((s) => ({ ...s, email: e.target.value }))} />
                      : <span className="font-medium">{r.email}</span>}
                  </TableCell>
                  <TableCell>
                    {editing
                      ? <Input value={editForm.name} className="h-8 w-28" onChange={(e) => setEditForm((s) => ({ ...s, name: e.target.value }))} />
                      : r.name}
                  </TableCell>
                  <TableCell>
                    {editing
                      ? <select value={editForm.role} className={selectCls + " h-8"} onChange={(e) => setEditForm((s) => ({ ...s, role: e.target.value }))}>
                          <option value="STAFF">직원</option>
                          <option value="ADMIN">관리자</option>
                        </select>
                      : roleLabel(r.role)}
                  </TableCell>
                  <TableCell>
                    {editing
                      ? <Input type="password" placeholder="변경 시 입력" className="h-8 w-32" value={editForm.password} onChange={(e) => setEditForm((s) => ({ ...s, password: e.target.value }))} />
                      : <span className="text-muted-foreground">••••</span>}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{r.createdAt?.slice(0, 10)}</TableCell>
                  <TableCell className="text-right">
                    {editing ? (
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => save(r.id)}><Check className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => setEditId(null)}><X className="h-4 w-4" /></Button>
                      </div>
                    ) : (
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => startEdit(r)}><Pencil className="h-4 w-4" /></Button>
                        {r.id !== currentUserId && (
                          <Button size="icon" variant="ghost" onClick={() => remove(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        )}
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
