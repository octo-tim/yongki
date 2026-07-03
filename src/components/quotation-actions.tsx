"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Printer, Mail, ArrowLeft, X } from "lucide-react";

export function QuotationActions({ proposalId, defaultEmail, isStaff }: { proposalId: string; defaultEmail: string; isStaff: boolean }) {
  const router = useRouter();
  const [emailOpen, setEmailOpen] = useState(false);
  const [to, setTo] = useState(defaultEmail);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function send() {
    if (!to.trim()) return;
    setBusy(true); setMsg("");
    const res = await fetch(`/api/proposals/${proposalId}/send`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ to }),
    });
    setBusy(false);
    if (res.ok) { setMsg("✓ 전송 완료"); setEmailOpen(false); }
    else { const j = await res.json().catch(() => ({})); setMsg(j.error || "전송 실패 — SMTP 설정을 확인하세요"); }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" onClick={() => router.back()}><ArrowLeft className="mr-1 h-4 w-4" />뒤로</Button>
        <div className="flex-1" />
        {isStaff && (
          <Button size="sm" variant="outline" onClick={() => setEmailOpen((v) => !v)}>
            {emailOpen ? <X className="mr-1 h-4 w-4" /> : <Mail className="mr-1 h-4 w-4" />}{emailOpen ? "닫기" : "이메일 전송"}
          </Button>
        )}
        <Button size="sm" onClick={() => window.print()}><Printer className="mr-1 h-4 w-4" />인쇄 / PDF 저장</Button>
      </div>
      {emailOpen && (
        <div className="flex items-center gap-2 rounded-md border bg-card p-2">
          <Input type="email" placeholder="받는 사람 이메일" value={to} onChange={(e) => setTo(e.target.value)} className="h-9" />
          <Button size="sm" onClick={send} disabled={busy}>{busy ? "전송 중..." : "전송"}</Button>
        </div>
      )}
      {msg && <p className="text-xs text-muted-foreground">{msg}</p>}
    </div>
  );
}
