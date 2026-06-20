"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { fmtDate, cn } from "@/lib/utils";
import { Trash2, Paperclip, X } from "lucide-react";

type FileRef = { id?: string; name: string; path: string };
type Meeting = {
  id: string; type: "INTERNAL" | "EXTERNAL"; title: string; content: string; meetingDate: any;
  client?: { id: string; name: string } | null;
  factory?: { id: string; name: string } | null;
  project?: { id: string; productName: string } | null;
  createdBy?: { name: string } | null;
  files?: FileRef[];
};
type Opt = { id: string; name: string };
type ProjOpt = { id: string; productName: string };

const selCls = "h-9 w-full rounded-md border border-input bg-background px-3 text-sm";

export function MeetingPanel({
  clients, factories = [], projects, fixedProjectId, meetings, limit, showProject = true, showAdd = true,
}: {
  clients: Opt[]; factories?: Opt[]; projects?: ProjOpt[]; fixedProjectId?: string;
  meetings: Meeting[]; limit?: number; showProject?: boolean; showAdd?: boolean;
}) {
  const router = useRouter();
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"INTERNAL" | "EXTERNAL">("INTERNAL");
  const [target, setTarget] = useState<"CLIENT" | "FACTORY">("CLIENT");
  const [clientId, setClientId] = useState("");
  const [factoryId, setFactoryId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [title, setTitle] = useState("");
  const [meetingDate, setMeetingDate] = useState(today);
  const [content, setContent] = useState("");
  const [files, setFiles] = useState<FileRef[]>([]);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function onPickFiles(list: FileList | null) {
    if (!list || list.length === 0) return;
    setUploading(true); setErr("");
    const added: FileRef[] = [];
    for (const f of Array.from(list)) {
      const fd = new FormData(); fd.append("file", f);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (res.ok) { const d = await res.json(); added.push({ name: f.name, path: d.path }); }
    }
    setFiles((prev) => [...prev, ...added]);
    setUploading(false);
  }

  async function add() {
    if (!title.trim()) { setErr("회의 제목을 입력하세요."); return; }
    if (!content.trim()) { setErr("회의 내용을 입력하세요."); return; }
    if (type === "EXTERNAL") {
      if (target === "CLIENT" && !clientId) { setErr("업체를 선택하세요."); return; }
      if (target === "FACTORY" && !factoryId) { setErr("공장을 선택하세요."); return; }
    }
    setBusy(true); setErr("");
    const res = await fetch("/api/meetings", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type, title, content, meetingDate,
        clientId: type === "EXTERNAL" && target === "CLIENT" ? clientId : null,
        factoryId: type === "EXTERNAL" && target === "FACTORY" ? factoryId : null,
        projectId: fixedProjectId ?? (projectId || null),
        files,
      }),
    });
    setBusy(false);
    if (!res.ok) { setErr("등록에 실패했습니다."); return; }
    setTitle(""); setContent(""); setClientId(""); setFactoryId(""); setFiles([]); setOpen(false); router.refresh();
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
                  <>
                    <div className="flex rounded-md border p-0.5 text-sm">
                      {(["CLIENT", "FACTORY"] as const).map((tk) => (
                        <button key={tk} onClick={() => setTarget(tk)}
                          className={cn("rounded px-3 py-1", target === tk ? "bg-foreground text-background" : "")}>
                          {tk === "CLIENT" ? "업체" : "공장"}
                        </button>
                      ))}
                    </div>
                    <div className="min-w-[150px] flex-1">
                      <label className="mb-1 block text-xs text-muted-foreground">{target === "CLIENT" ? "업체 *" : "공장 *"}</label>
                      {target === "CLIENT" ? (
                        <select className={selCls} value={clientId} onChange={(e) => setClientId(e.target.value)}>
                          <option value="">선택하세요</option>
                          {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      ) : (
                        <select className={selCls} value={factoryId} onChange={(e) => setFactoryId(e.target.value)}>
                          <option value="">선택하세요</option>
                          {factories.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                        </select>
                      )}
                    </div>
                  </>
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
              {/* 첨부파일 */}
              <div className="space-y-1.5">
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs hover:bg-accent">
                  <Paperclip className="h-3.5 w-3.5" /> 첨부파일 추가
                  <input type="file" multiple className="hidden" onChange={(e) => { onPickFiles(e.target.files); e.target.value = ""; }} />
                </label>
                {uploading && <span className="ml-2 text-xs text-muted-foreground">업로드 중...</span>}
                {files.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {files.map((f, i) => (
                      <span key={i} className="inline-flex items-center gap-1 rounded border bg-background px-2 py-1 text-xs">
                        <Paperclip className="h-3 w-3" />{f.name}
                        <button onClick={() => setFiles((p) => p.filter((_, j) => j !== i))}><X className="h-3 w-3 text-destructive" /></button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              {err && <p className="text-xs text-destructive">{err}</p>}
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={() => { setOpen(false); setErr(""); }}>취소</Button>
                <Button size="sm" onClick={add} disabled={busy || uploading}>{busy ? "등록 중..." : "등록"}</Button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="space-y-2">
        {shown.length === 0 && <p className="text-sm text-muted-foreground">등록된 회의록이 없습니다.</p>}
        {shown.map((m) => {
          const targetName = m.client?.name ?? m.factory?.name;
          const targetTag = m.client ? "업체" : m.factory ? "공장" : null;
          return (
            <div key={m.id} className="group rounded-md border p-3">
              <div className="mb-1 flex flex-wrap items-center gap-2 text-xs">
                <span className={cn("rounded-full border px-2 py-0.5 font-medium",
                  m.type === "EXTERNAL" ? "border-purple-200 bg-purple-100 text-purple-700" : "border-slate-200 bg-slate-100 text-slate-700")}>
                  {m.type === "EXTERNAL" ? "외부회의" : "내부회의"}
                </span>
                <span className="font-semibold text-foreground">{m.title}</span>
                <span className="text-muted-foreground">· {fmtDate(m.meetingDate)}</span>
                {targetName && <span className="text-muted-foreground">· {targetTag} {targetName}</span>}
                {showProject && m.project && (
                  <Link href={`/projects/${m.project.id}`} className="text-muted-foreground hover:underline">· {m.project.productName}</Link>
                )}
                {m.createdBy && <span className="text-muted-foreground">· 작성 {m.createdBy.name}</span>}
                <button onClick={() => remove(m.id)} className="ml-auto opacity-0 transition-opacity group-hover:opacity-100">
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </button>
              </div>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">{m.content}</p>
              {m.files && m.files.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {m.files.map((f) => (
                    <a key={f.id ?? f.path} href={f.path} target="_blank" rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded border bg-background px-2 py-1 text-xs hover:bg-accent">
                      <Paperclip className="h-3 w-3" />{f.name}
                    </a>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {limit && meetings.length > limit && (
        <Link href="/meetings" className="block text-center text-xs text-primary hover:underline">회의록 전체 보기 →</Link>
      )}
    </div>
  );
}
