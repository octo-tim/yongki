"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { fmtDate } from "@/lib/utils";
import { WORK_STATUS_MAP } from "@/lib/work-status";
import { Trash2 } from "lucide-react";

type WorkLog = {
  id: string; content: string; createdAt: string | Date; status?: string;
  assignee?: { id: string; name: string } | null;
  project?: { id: string; productName: string } | null;
};
type Opt = { id: string; name: string };
type ProjOpt = { id: string; productName: string };

export function WorkLogPanel({
  users, projects, fixedProjectId, logs, sortable, showProject,
}: {
  users: Opt[];
  projects?: ProjOpt[];
  fixedProjectId?: string;
  logs: WorkLog[];
  sortable?: boolean;
  showProject?: boolean;
}) {
  const router = useRouter();
  const [assigneeId, setAssigneeId] = useState("");
  const [projectId, setProjectId] = useState(fixedProjectId ?? "");
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [sortBy, setSortBy] = useState<"recent" | "assignee">("recent");

  async function add() {
    const pid = fixedProjectId ?? projectId;
    if (!pid) { setErr("프로젝트를 선택하세요."); return; }
    if (!content.trim()) { setErr("진행내역을 입력하세요."); return; }
    setBusy(true); setErr("");
    const res = await fetch("/api/worklogs", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: pid, assigneeId: assigneeId || null, content }),
    });
    setBusy(false);
    if (!res.ok) { setErr("등록에 실패했습니다."); return; }
    setContent(""); router.refresh();
  }

  async function remove(id: string) {
    if (!confirm("이 진행업무를 삭제하시겠습니까?")) return;
    await fetch(`/api/worklogs?id=${id}`, { method: "DELETE" });
    router.refresh();
  }

  const sorted = useMemo(() => {
    const arr = [...logs];
    if (sortBy === "assignee") {
      arr.sort((a, b) => {
        const an = a.assignee?.name ?? "~"; const bn = b.assignee?.name ?? "~";
        if (an !== bn) return an.localeCompare(bn, "ko");
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    } else {
      arr.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return arr;
  }, [logs, sortBy]);

  const selectCls = "h-9 w-full rounded-md border border-input bg-background px-3 text-sm";

  return (
    <div className="space-y-4">
      {/* 등록 폼 */}
      <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">담당자</label>
            <select className={selectCls} value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
              <option value="">선택 안함</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          {!fixedProjectId && projects && (
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">프로젝트</label>
              <select className={selectCls} value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                <option value="">선택하세요</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.productName}</option>)}
              </select>
            </div>
          )}
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">진행내역</label>
          <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="진행내역 입력..." rows={2} />
        </div>
        {err && <p className="text-xs text-destructive">{err}</p>}
        <div className="flex justify-end">
          <Button onClick={add} disabled={busy} size="sm">{busy ? "등록 중..." : "진행업무 등록"}</Button>
        </div>
      </div>

      {/* 정렬 */}
      {sortable && logs.length > 0 && (
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">정렬:</span>
          <button onClick={() => setSortBy("recent")} className={`rounded border px-2 py-0.5 ${sortBy === "recent" ? "bg-foreground text-background" : "hover:bg-accent"}`}>최신순</button>
          <button onClick={() => setSortBy("assignee")} className={`rounded border px-2 py-0.5 ${sortBy === "assignee" ? "bg-foreground text-background" : "hover:bg-accent"}`}>담당자순</button>
        </div>
      )}

      {/* 목록 */}
      <div className="space-y-2">
        {sorted.length === 0 && <p className="text-sm text-muted-foreground">등록된 진행업무가 없습니다.</p>}
        {sorted.map((l) => (
          <div key={l.id} className="group rounded-md border p-3 text-sm">
            <div className="mb-1 flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                {l.status && WORK_STATUS_MAP[l.status] && (
                  <span className={`rounded-full border px-1.5 py-0.5 text-[11px] font-medium ${WORK_STATUS_MAP[l.status].cls}`}>{WORK_STATUS_MAP[l.status].label}</span>
                )}
                <span className="rounded bg-accent px-1.5 py-0.5 font-medium text-foreground">{l.assignee?.name ?? "미지정"}</span>
                {showProject && l.project && (
                  <Link href={`/projects/${l.project.id}`} className="font-medium text-foreground hover:underline">{l.project.productName}</Link>
                )}
                <span>· {fmtDate(l.createdAt)}</span>
              </div>
              <button onClick={() => remove(l.id)} className="opacity-0 transition-opacity group-hover:opacity-100">
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </button>
            </div>
            <p className="whitespace-pre-wrap">{l.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
