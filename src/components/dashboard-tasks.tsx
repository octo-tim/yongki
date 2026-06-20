"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { fmtDate, cn } from "@/lib/utils";
import { WORK_STATUS, WORK_STATUS_MAP } from "@/lib/work-status";
import { Trash2, Plus } from "lucide-react";

type Task = {
  id: string; content: string; status: string; startDate: any; endDate: any;
  assignee?: { id: string; name: string } | null;
  creator?: { id: string; name: string } | null;
  project?: { id: string; productName: string } | null;
};
type Opt = { id: string; name: string };
type ProjOpt = { id: string; productName: string };

const selCls = "h-9 rounded-md border border-input bg-background px-3 text-sm";
const dstr = (v: any) => (v ? new Date(v).toISOString().slice(0, 10) : null);

export function DashboardTasks({ users, projects, tasks, currentUserId }: {
  users: Opt[]; projects: ProjOpt[]; tasks: Task[]; currentUserId?: string;
}) {
  const router = useRouter();
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });

  const [fStatus, setFStatus] = useState("ALL");
  const [fAssignee, setFAssignee] = useState<string>(currentUserId ?? "ALL");
  const [date, setDate] = useState(today);
  const [allDates, setAllDates] = useState(false);

  const [open, setOpen] = useState(false);
  const [aAssignee, setAAssignee] = useState(currentUserId ?? "");
  const [aProject, setAProject] = useState("");
  const [aStart, setAStart] = useState(today);
  const [aEnd, setAEnd] = useState("");
  const [aStatus, setAStatus] = useState("DOING");
  const [aContent, setAContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  function activeOn(t: Task, d: string) {
    const s = dstr(t.startDate), e = dstr(t.endDate);
    if (s && s > d) return false;
    if (e && e < d) return false;
    return true;
  }

  const filtered = useMemo(() => tasks.filter((t) => {
    if (fStatus !== "ALL" && t.status !== fStatus) return false;
    if (fAssignee === "NONE") { if (t.assignee) return false; }
    else if (fAssignee !== "ALL" && t.assignee?.id !== fAssignee) return false;
    if (!allDates && !activeOn(t, date)) return false;
    return true;
  }), [tasks, fStatus, fAssignee, date, allDates]);

  const countByStatus = (key: string) => tasks.filter((t) =>
    (fAssignee === "ALL" || (fAssignee === "NONE" ? !t.assignee : t.assignee?.id === fAssignee)) &&
    (allDates || activeOn(t, date)) && (key === "ALL" || t.status === key)
  ).length;

  async function add() {
    if (!aProject) { setErr("프로젝트를 선택하세요."); return; }
    if (!aContent.trim()) { setErr("업무내역을 입력하세요."); return; }
    setBusy(true); setErr("");
    const res = await fetch("/api/worklogs", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: aProject, assigneeId: aAssignee || null, content: aContent, startDate: aStart || null, endDate: aEnd || null, status: aStatus }),
    });
    setBusy(false);
    if (!res.ok) { setErr("등록에 실패했습니다."); return; }
    setAContent(""); setAEnd(""); setOpen(false); router.refresh();
  }
  async function patch(id: string, body: any) {
    await fetch("/api/worklogs", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...body }) });
    router.refresh();
  }
  async function remove(id: string) {
    if (!confirm("이 업무를 삭제하시겠습니까?")) return;
    await fetch(`/api/worklogs?id=${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {/* 필터 + 업무추가 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="flex items-center gap-1 text-xs">
            <span className="text-muted-foreground">상태</span>
            <button onClick={() => setFStatus("ALL")} className={cn("rounded border px-2 py-1", fStatus === "ALL" ? "bg-foreground text-background" : "hover:bg-accent")}>전체 {countByStatus("ALL")}</button>
            {WORK_STATUS.map((s) => (
              <button key={s.key} onClick={() => setFStatus(s.key)} className={cn("rounded border px-2 py-1", fStatus === s.key ? "bg-foreground text-background" : "hover:bg-accent")}>{s.label} {countByStatus(s.key)}</button>
            ))}
          </div>
          <div className="flex items-center gap-1 text-xs">
            <span className="text-muted-foreground">담당자</span>
            <select className={cn(selCls, "h-8 py-0")} value={fAssignee} onChange={(e) => setFAssignee(e.target.value)}>
              <option value="ALL">전체</option>
              {currentUserId && <option value={currentUserId}>나</option>}
              <option value="NONE">미지정</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-muted-foreground">날짜</span>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} disabled={allDates} className="h-8 w-[140px]" />
            <label className="flex cursor-pointer items-center gap-1">
              <input type="checkbox" checked={allDates} onChange={(e) => setAllDates(e.target.checked)} />
              전체기간
            </label>
          </div>
        </div>
        <Button size="sm" onClick={() => setOpen((o) => !o)}><Plus className="h-4 w-4" /> 업무추가</Button>
      </div>

      {/* 추가 폼 */}
      {open && (
        <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">담당자</label>
              <select className={cn(selCls, "w-full")} value={aAssignee} onChange={(e) => setAAssignee(e.target.value)}>
                <option value="">선택 안함</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">프로젝트</label>
              <select className={cn(selCls, "w-full")} value={aProject} onChange={(e) => setAProject(e.target.value)}>
                <option value="">선택하세요</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.productName}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">상태</label>
              <select className={cn(selCls, "w-full")} value={aStatus} onChange={(e) => setAStatus(e.target.value)}>
                {WORK_STATUS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">시작일</label>
                <Input type="date" value={aStart} onChange={(e) => setAStart(e.target.value)} className="h-9" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">종료일</label>
                <Input type="date" value={aEnd} onChange={(e) => setAEnd(e.target.value)} className="h-9" />
              </div>
            </div>
          </div>
          <Textarea value={aContent} onChange={(e) => setAContent(e.target.value)} placeholder="업무내역 입력..." rows={2} />
          {err && <p className="text-xs text-destructive">{err}</p>}
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => { setOpen(false); setErr(""); }}>취소</Button>
            <Button size="sm" onClick={add} disabled={busy}>{busy ? "등록 중..." : "등록"}</Button>
          </div>
        </div>
      )}

      {/* 목록 (내용 표시) */}
      <div className="space-y-2">
        {filtered.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">해당 조건의 업무가 없습니다.</p>}
        {filtered.map((t) => (
          <div key={t.id} className="group rounded-md border p-3">
            <div className="mb-1.5 flex flex-wrap items-center gap-2 text-xs">
              <select value={t.status} onChange={(e) => patch(t.id, { status: e.target.value })}
                className={cn("rounded-full border px-2 py-0.5 text-xs font-medium outline-none", WORK_STATUS_MAP[t.status]?.cls)}>
                {WORK_STATUS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
              <span className="rounded bg-accent px-1.5 py-0.5 font-medium text-foreground">{t.assignee?.name ?? "미지정"}</span>
              {t.project && <Link href={`/projects/${t.project.id}`} className="font-medium text-foreground hover:underline">{t.project.productName}</Link>}
              <span className="text-muted-foreground">· {fmtDate(t.startDate) || "?"} ~ {fmtDate(t.endDate) || "?"}</span>
              {t.creator && <span className="text-muted-foreground">· 작성 {t.creator.name}</span>}
              <button onClick={() => remove(t.id)} className="ml-auto opacity-0 transition-opacity group-hover:opacity-100">
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </button>
            </div>
            <p className="whitespace-pre-wrap text-sm">{t.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
