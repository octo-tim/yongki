"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { fmtDate, cn } from "@/lib/utils";
import { WORK_STATUS, WORK_STATUS_MAP } from "@/lib/work-status";
import { Trash2, Plus, AlertTriangle, CalendarClock } from "lucide-react";

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
// 칸반 컬럼 순서
const COLS = ["TODO", "DOING", "HOLD", "DONE"] as const;

export function DashboardTasks({ users, projects, tasks, currentUserId }: {
  users: Opt[]; projects: ProjOpt[]; tasks: Task[]; currentUserId?: string;
}) {
  const router = useRouter();
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
  const weekLater = new Date(new Date(`${today}T00:00:00Z`).getTime() + 6 * 86400000).toISOString().slice(0, 10);

  const [fAssignee, setFAssignee] = useState<string>("ALL");
  const [quick, setQuick] = useState<"ALL" | "OVERDUE" | "TODAY" | "WEEK">("ALL");

  const [open, setOpen] = useState(false);
  const [aAssignee, setAAssignee] = useState(currentUserId ?? "");
  const [aProject, setAProject] = useState("");
  const [aStart, setAStart] = useState(today);
  const [aEnd, setAEnd] = useState("");
  const [aStatus, setAStatus] = useState("DOING");
  const [aContent, setAContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const isOverdue = (t: Task) => { const e = dstr(t.endDate); return !!e && e < today && t.status !== "DONE"; };
  const isToday = (t: Task) => { const e = dstr(t.endDate); return e === today && t.status !== "DONE"; };
  const isWeek = (t: Task) => { const e = dstr(t.endDate); return !!e && e >= today && e <= weekLater && t.status !== "DONE"; };

  // 담당자 필터 적용 집합 (요약/칸반 공통 기준)
  const scoped = useMemo(() => tasks.filter((t) =>
    fAssignee === "ALL" ? true : fAssignee === "NONE" ? !t.assignee : t.assignee?.id === fAssignee
  ), [tasks, fAssignee]);

  const counts = useMemo(() => ({
    all: scoped.length,
    overdue: scoped.filter(isOverdue).length,
    today: scoped.filter(isToday).length,
    week: scoped.filter(isWeek).length,
  }), [scoped]);

  const visible = useMemo(() => scoped.filter((t) =>
    quick === "ALL" ? true : quick === "OVERDUE" ? isOverdue(t) : quick === "TODAY" ? isToday(t) : isWeek(t)
  ), [scoped, quick]);

  const byCol = (key: string) => visible.filter((t) => t.status === key)
    .sort((a, b) => (dstr(a.endDate) ?? "9999").localeCompare(dstr(b.endDate) ?? "9999"));

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

  const chip = (key: typeof quick, label: string, n: number, tone: string, icon?: React.ReactNode) => (
    <button onClick={() => setQuick(quick === key ? "ALL" : key)}
      className={cn("flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-colors",
        quick === key ? "ring-2 ring-offset-1" : "hover:bg-accent", tone)}>
      {icon}<span>{label}</span><span className="font-bold tabular-nums">{n}</span>
    </button>
  );

  return (
    <div className="space-y-4">
      {/* 상단: 담당자 필터 + 업무추가 */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-sm">
          <span className="text-muted-foreground">담당자</span>
          <select className={cn(selCls, "h-8 py-0")} value={fAssignee} onChange={(e) => setFAssignee(e.target.value)}>
            <option value="ALL">전체</option>
            {currentUserId && <option value={currentUserId}>나</option>}
            <option value="NONE">미지정</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
        <Button size="sm" onClick={() => setOpen((o) => !o)}><Plus className="h-4 w-4" /> 업무추가</Button>
      </div>

      {/* 긴급도 요약 (클릭 = 빠른 필터) */}
      <div className="flex flex-wrap gap-2">
        {chip("ALL", "전체", counts.all, "border-slate-200")}
        {chip("OVERDUE", "지연", counts.overdue, "border-red-200 bg-red-50 text-red-700", <AlertTriangle className="h-3.5 w-3.5" />)}
        {chip("TODAY", "오늘마감", counts.today, "border-amber-200 bg-amber-50 text-amber-700", <CalendarClock className="h-3.5 w-3.5" />)}
        {chip("WEEK", "이번주", counts.week, "border-blue-200 bg-blue-50 text-blue-700")}
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

      {/* 상태별 칸반 */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {COLS.map((key) => {
          const meta = WORK_STATUS_MAP[key];
          const rows = byCol(key);
          return (
            <div key={key} className="flex flex-col rounded-lg border bg-muted/20">
              <div className="flex items-center justify-between border-b px-3 py-2">
                <span className={cn("rounded-full border px-2 py-0.5 text-xs font-semibold", meta?.cls)}>{meta?.label}</span>
                <span className="text-xs font-semibold text-muted-foreground tabular-nums">{rows.length}</span>
              </div>
              <div className="max-h-[460px] space-y-2 overflow-y-auto p-2">
                {rows.length === 0 && <p className="py-4 text-center text-xs text-muted-foreground">없음</p>}
                {rows.map((t) => {
                  const over = isOverdue(t), due = isToday(t);
                  return (
                    <div key={t.id} className={cn("group rounded-md border bg-background p-2.5 shadow-sm",
                      over ? "border-l-4 border-l-red-500" : due ? "border-l-4 border-l-amber-500" : "")}>
                      <div className="mb-1 flex items-center justify-between gap-1">
                        {t.project
                          ? <Link href={`/projects/${t.project.id}`} className="truncate text-xs font-semibold hover:underline">{t.project.productName}</Link>
                          : <span className="truncate text-xs font-semibold text-muted-foreground">프로젝트 미지정</span>}
                        <button onClick={() => remove(t.id)} className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100">
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </button>
                      </div>
                      <p className="mb-1.5 line-clamp-3 whitespace-pre-wrap text-sm">{t.content}</p>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
                        <span className="rounded bg-accent px-1.5 py-0.5 font-medium text-foreground">{t.assignee?.name ?? "미지정"}</span>
                        {t.endDate && (
                          <span className={cn(over ? "font-semibold text-red-600" : due ? "font-semibold text-amber-600" : "")}>
                            ~{fmtDate(t.endDate)}{over ? " (지연)" : due ? " (오늘)" : ""}
                          </span>
                        )}
                      </div>
                      <select value={t.status} onChange={(e) => patch(t.id, { status: e.target.value })}
                        title="상태 변경"
                        className="mt-1.5 w-full rounded border border-input bg-background px-1.5 py-1 text-[11px] outline-none">
                        {WORK_STATUS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                      </select>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
