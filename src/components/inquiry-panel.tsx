"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Plus, X, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type Msg = { id: string; senderType: string; senderName: string; content: string; createdAt: string };
type Inquiry = { id: string; subject: string; status: string; createdAt: string; messages: Msg[] };

export function InquiryPanel({ projectId, clientId, inquiries, role }: {
  projectId?: string; clientId?: string; inquiries: Inquiry[]; role: "CLIENT" | "STAFF";
}) {
  const router = useRouter();
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);
  const [subject, setSubject] = useState(""); const [content, setContent] = useState("");
  const [replyId, setReplyId] = useState<string | null>(null); const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);

  function toggle(id: string) { setOpen((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; }); }

  async function submit() {
    if (!subject.trim() || !content.trim()) return;
    setBusy(true);
    const res = await fetch("/api/portal/inquiries", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, content, projectId, clientId }),
    });
    setBusy(false);
    if (res.ok) { setSubject(""); setContent(""); setAdding(false); router.refresh(); }
    else alert("등록 실패");
  }
  async function submitReply(id: string) {
    if (!reply.trim()) return;
    const res = await fetch(`/api/portal/inquiries/${id}/messages`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: reply }),
    });
    if (res.ok) { setReply(""); setReplyId(null); router.refresh(); }
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setAdding((v) => !v)}>{adding ? <X className="mr-1 h-4 w-4" /> : <Plus className="mr-1 h-4 w-4" />}{adding ? "닫기" : "문의하기"}</Button>
      </div>

      {adding && (
        <div className="space-y-2 rounded-md border bg-muted/30 p-3">
          <Input placeholder="문의 제목" value={subject} onChange={(e) => setSubject(e.target.value)} className="h-9" />
          <Textarea placeholder="문의 내용을 입력하세요" value={content} onChange={(e) => setContent(e.target.value)} rows={3} />
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={() => setAdding(false)}>취소</Button>
            <Button size="sm" onClick={submit} disabled={busy}>{busy ? "등록 중..." : "등록"}</Button>
          </div>
        </div>
      )}

      {inquiries.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
          <MessageSquare className="h-8 w-8 opacity-40" />
          <p className="text-sm">등록된 문의가 없습니다.</p>
        </div>
      )}

      <div className="divide-y rounded-md border">
        {inquiries.map((iq) => {
          const isOpen = open.has(iq.id);
          return (
            <div key={iq.id}>
              <button onClick={() => toggle(iq.id)} className="flex w-full items-center gap-2 px-3 py-2.5 text-left hover:bg-accent/50">
                <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="flex-1 text-sm font-medium">{iq.subject}</span>
                <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", iq.status === "답변완료" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700")}>{iq.status}</span>
                <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
              </button>
              {isOpen && (
                <div className="space-y-2 bg-muted/20 px-3 pb-3">
                  {iq.messages.map((m) => (
                    <div key={m.id} className={cn("flex", m.senderType === "STAFF" ? "justify-end" : "justify-start")}>
                      <div className={cn("max-w-[80%] rounded-lg px-3 py-2 text-sm", m.senderType === "STAFF" ? "bg-primary text-primary-foreground" : "bg-background border")}>
                        <div className="mb-0.5 flex items-center gap-2 text-[11px] opacity-75">
                          <span className="font-medium">{m.senderType === "STAFF" ? `담당자 ${m.senderName}` : m.senderName}</span>
                          <span>{new Date(m.createdAt).toISOString().slice(0, 16).replace("T", " ")}</span>
                        </div>
                        <p className="whitespace-pre-wrap">{m.content}</p>
                      </div>
                    </div>
                  ))}
                  {replyId === iq.id ? (
                    <div className="flex gap-2 pt-1">
                      <Input value={reply} onChange={(e) => setReply(e.target.value)} placeholder="답변 입력" className="h-9" onKeyDown={(e) => e.key === "Enter" && submitReply(iq.id)} />
                      <Button size="sm" onClick={() => submitReply(iq.id)}>전송</Button>
                    </div>
                  ) : (
                    <button onClick={() => setReplyId(iq.id)} className="pt-1 text-xs text-primary hover:underline">
                      {role === "STAFF" ? "답변하기" : "추가 문의"}
                    </button>
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
