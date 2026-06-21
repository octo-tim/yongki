"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { WorkRequestPanel } from "@/components/work-request-panel";
import { cn, fmtDate } from "@/lib/utils";
import { List, Calendar as CalIcon, Columns3, ChevronLeft, ChevronRight, CheckCircle2, Building2, Factory as FactoryIcon, Package } from "lucide-react";

type WReq = {
  id: string; content: string; category?: string | null; requestDate: any; startDate?: any; endDate?: any; done?: boolean;
  requester?: { name: string } | null; assignee?: { id: string; name: string } | null;
  client?: { id: string; name: string } | null; factory?: { id: string; name: string } | null;
  project?: { id: string; productName: string } | null; updates: any[];
};
type Opt = { id: string; name: string };

const CATEGORIES = ["제안서발송", "업체전달사항", "공장확인사항", "공장결재"];
const KANBAN_COLS = [...CATEGORIES, "미분류"];
const CAT_STYLE: Record<string, string> = {
  제안서발송: "bg-violet-100 text-violet-700 border-violet-200",
  업체전달사항: "bg-blue-100 text-blue-700 border-blue-200",
  공장확인사항: "bg-amber-100 text-amber-700 border-amber-200",
  공장결재: "bg-rose-100 text-rose-700 border-rose-200",
  미분류: "bg-muted text-muted-foreground border-border",
};
const CAT_DOT: Record<string, string> = {
  제안서발송: "bg-violet-500", 업체전달사항: "bg-blue-500", 공장확인사항: "bg-amber-500", 공장결재: "bg-rose-500", 미분류: "bg-muted-foreground",
};

export function WorkViews({ requests, clients = [], factories = [], projects = [], users = [], currentUserId }: {
  requests: WReq[]; clients?: Opt[]; factories?: Opt[]; projects?: Opt[]; users?: Opt[]; currentUserId?: string;
}) {
  const [view, setView] = useState<"list" | "calendar" | "kanban">("list");
  return (
    <div className="space-y-3">
      <div className="inline-flex rounded-full border bg-card p-0.5 shadow-sm">
        <ViewBtn active={view === "list"} onClick={() => setView("list")} icon={List}>리스트</ViewBtn>
        <ViewBtn active={view === "calendar"} onClick={() => setView("calendar")} icon={CalIcon}>캘린더</ViewBtn>
        <ViewBtn active={view === "kanban"} onClick={() => setView("kanban")} icon={Columns3}>칸반</ViewBtn>
      </div>

      {view === "list" && (
        <WorkRequestPanel requests={requests as any} clients={clients} factories={factories} projects={projects} users={users} currentUserId={currentUserId} showFilters />
      )}
      {view === "calendar" && <CalendarView requests={requests} />}
      {view === "kanban" && <KanbanView requests={requests} />}
    </div>
  );
}

function ViewBtn({ active, onClick, icon: Icon, children }: { active: boolean; onClick: () => void; icon: any; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={cn("flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
        active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent")}>
      <Icon className="h-3.5 w-3.5" /> {children}
    </button>
  );
}

/* ── 캘린더뷰 (요청일 기준) ── */
function CalendarView({ requests }: { requests: WReq[] }) {
  const now = new Date();
  const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const first = new Date(ym.y, ym.m, 1);
  const daysInMonth = new Date(ym.y, ym.m + 1, 0).getDate();
  const lead = first.getDay();
  const todayKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;

  const byDay = new Map<string, WReq[]>();
  for (const r of requests) {
    const d = r.requestDate ? new Date(r.requestDate) : null;
    if (!d || d.getFullYear() !== ym.y || d.getMonth() !== ym.m) continue;
    const k = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    (byDay.get(k) ?? byDay.set(k, []).get(k)!).push(r);
  }

  const cells: (number | null)[] = [];
  for (let i = 0; i < lead; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="rounded-xl border bg-card p-3">
      <div className="mb-2 flex items-center justify-between">
        <button onClick={() => setYm((p) => ({ y: p.m === 0 ? p.y - 1 : p.y, m: (p.m + 11) % 12 }))} className="rounded-full p-1.5 hover:bg-accent"><ChevronLeft className="h-4 w-4" /></button>
        <div className="text-sm font-semibold">{ym.y}년 {ym.m + 1}월</div>
        <button onClick={() => setYm((p) => ({ y: p.m === 11 ? p.y + 1 : p.y, m: (p.m + 1) % 12 }))} className="rounded-full p-1.5 hover:bg-accent"><ChevronRight className="h-4 w-4" /></button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-muted-foreground">
        {["일", "월", "화", "수", "목", "금", "토"].map((w, i) => <div key={w} className={cn("py-1", i === 0 && "text-red-500", i === 6 && "text-blue-500")}>{w}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (d === null) return <div key={i} className="min-h-[84px] rounded-md bg-muted/20" />;
          const k = `${ym.y}-${ym.m}-${d}`;
          const items = byDay.get(k) ?? [];
          const isToday = k === todayKey;
          return (
            <div key={i} className={cn("min-h-[84px] rounded-md border p-1", isToday && "border-primary ring-1 ring-primary")}>
              <div className={cn("mb-0.5 text-[11px] font-semibold", isToday && "text-primary")}>{d}</div>
              <div className="space-y-0.5">
                {items.slice(0, 3).map((r) => {
                  const cat = r.category ?? "미분류";
                  const inner = (
                    <span className={cn("block truncate rounded px-1 py-0.5 text-[10px] leading-tight", CAT_STYLE[cat] ?? CAT_STYLE["미분류"], r.done && "line-through opacity-60")}>
                      {r.content}
                    </span>
                  );
                  return r.project ? <Link key={r.id} href={`/projects/${r.project.id}`} title={r.content}>{inner}</Link> : <div key={r.id} title={r.content}>{inner}</div>;
                })}
                {items.length > 3 && <span className="block px-1 text-[10px] text-muted-foreground">+{items.length - 3}건</span>}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
        {KANBAN_COLS.map((c) => <span key={c} className="inline-flex items-center gap-1"><span className={cn("h-2 w-2 rounded-sm", CAT_DOT[c])} />{c}</span>)}
      </div>
    </div>
  );
}

/* ── 칸반뷰 (업무구분 컬럼) ── */
function KanbanView({ requests }: { requests: WReq[] }) {
  const router = useRouter();
  const cols = KANBAN_COLS.map((c) => ({ name: c, items: requests.filter((r) => (r.category ?? "미분류") === c) }));

  async function toggle(id: string, done: boolean) {
    await fetch("/api/work-requests", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, done }) });
    router.refresh();
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {cols.map((col) => (
        <div key={col.name} className="flex w-72 shrink-0 flex-col rounded-xl border bg-muted/20">
          <div className="flex items-center gap-2 border-b px-3 py-2">
            <span className={cn("h-2.5 w-2.5 rounded-sm", CAT_DOT[col.name])} />
            <span className="text-sm font-semibold">{col.name}</span>
            <span className="text-xs text-muted-foreground">{col.items.length}</span>
          </div>
          <div className="space-y-2 p-2">
            {col.items.length === 0 && <p className="py-4 text-center text-xs text-muted-foreground">없음</p>}
            {col.items.map((r) => (
              <div key={r.id} className={cn("rounded-lg border bg-card p-2.5 shadow-sm", r.done && "opacity-60")}>
                <div className="mb-1 flex items-center gap-1.5">
                  <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-semibold", r.done ? "bg-emerald-100 text-emerald-700" : "bg-orange-100 text-orange-700")}>{r.done ? "완료" : "요청"}</span>
                  <span className="ml-auto text-[10px] text-muted-foreground">{fmtDate(r.requestDate)}</span>
                </div>
                <p className={cn("whitespace-pre-wrap text-xs", r.done && "line-through")}>{r.content}</p>
                <div className="mt-1.5 flex flex-wrap gap-1 text-[10px]">
                  {r.client && <Link href={`/clients/${r.client.id}`} className="inline-flex items-center gap-0.5 rounded bg-accent px-1 py-0.5 hover:underline"><Building2 className="h-2.5 w-2.5" />{r.client.name}</Link>}
                  {r.factory && <Link href={`/factories/${r.factory.id}`} className="inline-flex items-center gap-0.5 rounded bg-accent px-1 py-0.5 hover:underline"><FactoryIcon className="h-2.5 w-2.5" />{r.factory.name}</Link>}
                  {r.project && <Link href={`/projects/${r.project.id}`} className="inline-flex items-center gap-0.5 rounded bg-accent px-1 py-0.5 hover:underline"><Package className="h-2.5 w-2.5" />{r.project.productName}</Link>}
                  {r.assignee && <span className="rounded bg-blue-100 px-1 py-0.5 font-medium text-blue-700">{r.assignee.name}</span>}
                </div>
                <button onClick={() => toggle(r.id, !r.done)}
                  className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground">
                  <CheckCircle2 className="h-3 w-3" />{r.done ? "완료취소" : "완료처리"}
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
