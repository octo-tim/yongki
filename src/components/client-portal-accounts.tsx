"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, KeyRound, X } from "lucide-react";

type PortalUser = { id: string; email: string; name: string; createdAt: string };

export function ClientPortalAccounts({ clientId, users }: { clientId: string; users: PortalUser[] }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState(""); const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false); const [err, setErr] = useState("");

  async function submit() {
    if (!name.trim() || !email.trim() || !password.trim()) return;
    setBusy(true); setErr("");
    const res = await fetch(`/api/clients/${clientId}/portal-users`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, email, password }),
    });
    setBusy(false);
    if (res.ok) { setName(""); setEmail(""); setPassword(""); setAdding(false); router.refresh(); }
    else { const j = await res.json().catch(() => ({})); setErr(j.error || "생성 실패"); }
  }
  async function remove(id: string) {
    if (!confirm("이 포털 계정을 삭제하시겠습니까?")) return;
    const res = await fetch(`/api/clients/${clientId}/portal-users/${id}`, { method: "DELETE" });
    if (res.ok) router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">고객이 이 계정으로 <span className="font-medium text-foreground">코스메팩 파트너센터</span>(/portal)에 로그인해 진행현황을 확인합니다.</p>
        <Button size="sm" variant="outline" onClick={() => setAdding((v) => !v)}>{adding ? <X className="mr-1 h-4 w-4" /> : <Plus className="mr-1 h-4 w-4" />}{adding ? "닫기" : "계정 발급"}</Button>
      </div>

      {adding && (
        <div className="grid gap-2 rounded-md border bg-muted/30 p-3 sm:grid-cols-3">
          <Input placeholder="담당자명" value={name} onChange={(e) => setName(e.target.value)} className="h-9" />
          <Input placeholder="로그인 이메일" value={email} onChange={(e) => setEmail(e.target.value)} className="h-9" />
          <div className="flex gap-2">
            <Input placeholder="비밀번호" value={password} onChange={(e) => setPassword(e.target.value)} className="h-9" />
            <Button size="sm" onClick={submit} disabled={busy}>{busy ? "생성 중..." : "생성"}</Button>
          </div>
          {err && <p className="text-xs text-destructive sm:col-span-3">{err}</p>}
        </div>
      )}

      {users.length === 0 ? (
        <p className="text-sm text-muted-foreground">발급된 포털 계정이 없습니다.</p>
      ) : (
        <div className="divide-y rounded-md border">
          {users.map((u) => (
            <div key={u.id} className="flex items-center gap-3 px-3 py-2 text-sm">
              <KeyRound className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="font-medium">{u.name}</span>
              <span className="text-muted-foreground">{u.email}</span>
              <span className="ml-auto text-xs text-muted-foreground">{new Date(u.createdAt).toISOString().slice(0, 10)}</span>
              <button onClick={() => remove(u.id)} className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
