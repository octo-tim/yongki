"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { fmtDate, cn } from "@/lib/utils";
import { Trash2 } from "lucide-react";

type Meeting = {
  id: string; type: "INTERNAL" | "EXTERNAL"; title: string; content: string; meetingDate: any;
  client?: { id: string; name: string } | null;
  project?: { id: string; productName: string } | null;
  createdBy?: { name: string } | null;
};
type Opt = { id: string; name: string };
type ProjOpt = { id: string; productName: string };

const selCls = "h-9 w-full rounded-md border border-input bg-background px-3 text-sm";

export function MeetingPanel({
  clients, projects, fixedProjectId, meetings, limit, showProject = true, showAdd = true,
}: {
  clients: Opt[]; projects?: ProjOpt[]; fixedProjectId?: string;
  meetings: Meeting[]; limit?: number; showProject?: boolean; showAdd?: boolean;
}) {
  const router = useRouter();
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"INTERNAL" | "EXTERNAL">("INTERNAL");
  const [clientId, setClientId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [title, setTitle] = useState("");
  const [meetingDate, setMeetingDate] = useState(today);
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function add() {
    if (!title.trim()) { setErr("회의 제목을 입력하세요."); return; }
    if (!content.trim()) { setErr("회의 내용을 입력하세요."); return; }
    if (type === "EXTERNAL" && !clientId) { setErr("외부회의는 거래처를 지정하세요."); return; }
    setBusy(true); setErr("");
    const res = await fetch("/api/meetings", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, title, content, meetingDate, clientId: type === "EXTERNAL" ? clientId : null, projectId: fixedProjectId ?? (projectId || null) }),
    });
    setBusy(false);
    if (!res.ok) { setErr("등록에 실패했습니다."); return; }
    setTitle(""); setContent(""); setClientId(""); setOpen(false); router.refresh();
  }
  async function remove(id: string) {
    if (!confirm("이 회의록을 삭제하시겠습니까?")) return;
    await fetch(`/api/meetings?id=${id}`, { method: "DELETE" });
    router.refresh();
  }

  const shown = limit ? meetings.slice(0, limit) : meetings;

  return (
    <div className="space-y-3">
      {showAdd && (
        <div className="rounded-lg border bg-muted/20 p-3">
          {!open ? (
            <Button size="sm" variant="outline" onClick={() => setOpen(true)}>+ 회의록 작성</Button>
          ) : (
            <div className="space-y-2">
              <div className="flex flex-wrap items-end gap-2">
                <div className="flex rounded-md border p-0.5 text-sm">
                  {(["INTERNAL", "EXTERNAL"] as const).map((tk) => (
                    <button key={tk} onClick={() => setType(tk)}
                      className={cn("rounded px-3 py-1", type === tk ? "bg-foreground text-background" : "")}>
                      {tk === "INTERNAL" ? "내부회의" : "외부회의"}
                    </button>
                  ))}
                </div>
                <div className="w-36">
                  <label className="mb-1 block text-xs text-muted-foreground">회의 일자</label>
                  <Input type="date" value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)} className="h-9" />
                </div>
                {type === "EXTERNAL" && (
                  <div className="min-w-[140px] flex-1">
                    <label className="mb-1 block text-xs text-muted-foreground">거래처 *</label>
                    <select className={selCls} value={clientId} onChange={(e) => setClientId(e.target.value)}>
                      <option value="">선택하세요</option>
                      {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                )}
                {!fixedProjectId && projects && (
                  <div className="min-w-[140px] flex-1">
                    <label className="mb-1 block text-xs text-muted-foreground">프로젝트(선택)</label>
                    <select className={selCls} value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                      <option value="">연결 안함</option>
                      {projects.map((p) => <option key={p.id} value={p.id}>{p.productName}</option>)}
                    </select>
                  </div>
                )}
              </div>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="회의 제목" className="h-9" />
              <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="회의 내용 정리..." rows={3} />
              {err && <p className="text-xs text-destructive">{err}</p>}
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={() => { setOpen(false); setErr(""); }}>취소</Button>
                <Button size="sm" onClick={add} disabled={busy}>{busy ? "등록 중..." : "등록"}</Button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="space-y-2">
        {shown.length === 0 && <p className="text-sm text-muted-foreground">등록된 회의록이 없습니다.</p>}
        {shown.map((m) => (
          <div key={m.id} className="group rounded-md border p-3">
            <div className="mb-1 flex flex-wrap items-center gap-2 text-xs">
              <span className={cn("rounded-full border px-2 py-0.5 font-medium",
                m.type === "EXTERNAL" ? "border-purple-200 bg-purple-100 text-purple-700" : "border-slate-200 bg-slate-100 text-slate-700")}>
                {m.type === "EXTERNAL" ? "외부회의" : "내부회의"}
              </span>
              <span className="font-semibold text-foreground">{m.title}</span>
              <span className="text-muted-foreground">· {fmtDate(m.meetingDate)}</span>
              {m.type === "EXTERNAL" && m.client && <span className="text-muted-foreground">· {m.client.name}</span>}
              {showProject && m.project && (
                <Link href={`/projects/${m.project.id}`} className="text-muted-foreground hover:underline">· {m.project.productName}</Link>
              )}
              {m.createdBy && <span className="text-muted-foreground">· 작성 {m.createdBy.name}</span>}
              <button onClick={() => remove(m.id)} className="ml-auto opacity-0 transition-opacity group-hover:opacity-100">
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </button>
            </div>
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">{m.content}</p>
          </div>
        ))}
      </div>

      {limit && meetings.length > limit && (
        <Link href="/meetings" className="block text-center text-xs text-primary hover:underline">회의록 전체 보기 →</Link>
      )}
    </div>
  );
}
