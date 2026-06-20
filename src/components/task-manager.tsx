"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fmtDate, cn } from "@/lib/utils";
import { WORK_STATUS, WORK_STATUS_MAP } from "@/lib/work-status";
import { Trash2 } from "lucide-react";

type Task = {
  id: string; content: string; status: string; startDate: any; endDate: any; createdAt: any;
  assignee?: { id: string; name: string } | null;
  creator?: { id: string; name: string } | null;
  project?: { id: string; productName: string } | null;
};
type Opt = { id: string; name: string };
type ProjOpt = { id: string; productName: string };

const selCls = "h-9 w-full rounded-md border border-input bg-background px-3 text-sm";

export function TaskManager({ users, projects, tasks }: { users: Opt[]; projects: ProjOpt[]; tasks: Task[] }) {
  const router = useRouter();
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
  const [assigneeId, setAssigneeId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState("DOING");
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [groupBy, setGroupBy] = useState<"assignee" | "project">("assignee");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");

  async function add() {
    if (!projectId) { setErr("프로젝트를 선택하세요."); return; }
    if (!content.trim()) { setErr("업무내역을 입력하세요."); return; }
    setBusy(true); setErr("");
    const res = await fetch("/api/worklogs", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, assigneeId: assigneeId || null, content, startDate: startDate || null, endDate: endDate || null, status }),
    });
    setBusy(false);
    if (!res.ok) { setErr("등록에 실패했습니다."); return; }
    setContent(""); setEndDate(""); router.refresh();
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

  const filtered = useMemo(
    () => (filterStatus === "ALL" ? tasks : tasks.filter((t) => t.status === filterStatus)),
    [tasks, filterStatus]
  );

  const groups = useMemo(() => {
    const m = new Map<string, { label: string; projectId?: string; rows: Task[] }>();
    for (const t of filtered) {
      const key = groupBy === "assignee" ? (t.assignee?.id ?? "none") : (t.project?.id ?? "none");
      const label = groupBy === "assignee" ? (t.assignee?.name ?? "담당자 미지정") : (t.project?.productName ?? "프로젝트 미지정");
      if (!m.has(key)) m.set(key, { label, projectId: groupBy === "project" ? t.project?.id : undefined, rows: [] });
      m.get(key)!.rows.push(t);
    }
    return [...m.values()].sort((a, b) => b.rows.length - a.rows.length);
  }, [filtered, groupBy]);

  return (
    <div className="space-y-6">
      {/* 업무 생성 */}
      <Card>
        <CardHeader><CardTitle className="text-base">업무 생성</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">담당자</label>
              <select className={selCls} value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
                <option value="">선택 안함</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">프로젝트</label>
              <select className={selCls} value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                <option value="">선택하세요</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.productName}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">상태</label>
              <select className={selCls} value={status} onChange={(e) => setStatus(e.target.value)}>
                {WORK_STATUS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">시작일</label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-9" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">종료일</label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-9" />
              </div>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">업무내역</label>
            <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="업무내역 입력..." rows={2} />
          </div>
          {err && <p className="text-xs text-destructive">{err}</p>}
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">※ 업무생성자는 현재 로그인 사용자로 자동 기록됩니다.</p>
            <Button onClick={add} disabled={busy} size="sm">{busy ? "등록 중..." : "업무 등록"}</Button>
          </div>
        </CardContent>
      </Card>

      {/* 보기 옵션 */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 text-sm">
          <span className="text-muted-foreground">보기:</span>
          <button onClick={() => setGroupBy("assignee")} className={cn("rounded border px-2.5 py-1", groupBy === "assignee" ? "bg-foreground text-background" : "hover:bg-accent")}>담당자별</button>
          <button onClick={() => setGroupBy("project")} className={cn("rounded border px-2.5 py-1", groupBy === "project" ? "bg-foreground text-background" : "hover:bg-accent")}>프로젝트별</button>
        </div>
        <div className="flex items-center gap-1 text-sm">
          <span className="text-muted-foreground">상태:</span>
          <button onClick={() => setFilterStatus("ALL")} className={cn("rounded border px-2 py-1 text-xs", filterStatus === "ALL" ? "bg-foreground text-background" : "hover:bg-accent")}>전체</button>
          {WORK_STATUS.map((s) => (
            <button key={s.key} onClick={() => setFilterStatus(s.key)} className={cn("rounded border px-2 py-1 text-xs", filterStatus === s.key ? "bg-foreground text-background" : "hover:bg-accent")}>{s.label}</button>
          ))}
        </div>
      </div>

      {/* 그룹별 목록 */}
      <div className="space-y-4">
        {groups.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">등록된 업무가 없습니다.</p>}
        {groups.map((g) => (
          <div key={g.label} className="space-y-2">
            <div className="flex items-center gap-2">
              {groupBy === "project" && g.projectId
                ? <Link href={`/projects/${g.projectId}`} className="font-semibold hover:underline">{g.label}</Link>
                : <span className="font-semibold">{g.label}</span>}
              <span className="text-xs text-muted-foreground">{g.rows.length}건</span>
            </div>
            <div className="space-y-1.5">
              {g.rows.map((t) => (
                <div key={t.id} className="group rounded-md border p-3">
                  <div className="mb-1.5 flex flex-wrap items-center gap-2 text-xs">
                    <select value={t.status} onChange={(e) => patch(t.id, { status: e.target.value })}
                      className={cn("rounded-full border px-2 py-0.5 text-xs font-medium outline-none", WORK_STATUS_MAP[t.status]?.cls)}>
                      {WORK_STATUS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                    </select>
                    {groupBy === "assignee"
                      ? (t.project && <Link href={`/projects/${t.project.id}`} className="font-medium text-foreground hover:underline">{t.project.productName}</Link>)
                      : <span className="font-medium text-foreground">담당자 {t.assignee?.name ?? "미지정"}</span>}
                    <span className="text-muted-foreground">
                      · {fmtDate(t.startDate) || "?"} ~ {fmtDate(t.endDate) || "?"}
                    </span>
                    <span className="text-muted-foreground">· 작성자 {t.creator?.name ?? "-"}</span>
                    <button onClick={() => remove(t.id)} className="ml-auto opacity-0 transition-opacity group-hover:opacity-100">
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </button>
                  </div>
                  <p className="whitespace-pre-wrap text-sm">{t.content}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
