"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SearchableSelect } from "@/components/searchable-select";
import { fmtDate, cn } from "@/lib/utils";
import { Trash2, Plus, Building2, Factory as FactoryIcon, Package, CheckCircle2, ChevronRight, Search as SearchIcon } from "lucide-react";

type Update = { id: string; content: string; progressDate: any; createdBy?: { name: string } | null };
type WReq = {
  id: string; content: string; category?: string | null; photos?: string | null; requestDate: any; startDate?: any; endDate?: any; done?: boolean; requesterId?: string | null;
  requester?: { name: string } | null;
  assignee?: { id: string; name: string } | null;
  client?: { id: string; name: string } | null;
  factory?: { id: string; name: string } | null;
  project?: { id: string; productName: string; productPhoto?: string | null } | null;
  updates: Update[];
};
type Opt = { id: string; name: string };

const CATEGORIES = ["제안서발송", "업체전달사항", "공장확인사항", "공장결재", "샘플발송", "기타"];
const CAT_STYLE: Record<string, string> = {
  제안서발송: "bg-violet-100 text-violet-700",
  업체전달사항: "bg-blue-100 text-blue-700",
  공장확인사항: "bg-amber-100 text-amber-700",
  공장결재: "bg-rose-100 text-rose-700",
  샘플발송: "bg-emerald-100 text-emerald-700",
  기타: "bg-slate-100 text-slate-700",
};
const selCls = "h-9 w-full rounded-md border border-input bg-background px-3 text-sm";

export function WorkRequestPanel({
  clients = [], factories = [], projects = [], users = [], requests, currentUserId, showCreate = true, fixedProjectId, fixedClientId, fixedFactoryId, showFilters = false,
}: {
  clients?: Opt[]; factories?: Opt[]; projects?: Opt[]; users?: Opt[]; requests: WReq[]; currentUserId?: string; showCreate?: boolean; fixedProjectId?: string; fixedClientId?: string; fixedFactoryId?: string; showFilters?: boolean;
}) {
  const router = useRouter();
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
  const [open, setOpen] = useState(false);
  const [clientId, setClientId] = useState(fixedClientId ?? "");
  const [factoryId, setFactoryId] = useState(fixedFactoryId ?? "");
  const [projectId, setProjectId] = useState(fixedProjectId ?? "");
  const [assigneeId, setAssigneeId] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [requestDate, setRequestDate] = useState(today);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function uploadPhotos(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    const uploaded: string[] = [];
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (res.ok) { const d = await res.json(); if (d.path) uploaded.push(d.path); }
    }
    setPhotos((prev) => [...prev, ...uploaded]);
    setUploading(false);
  }

  async function add() {
    if (!content.trim()) { setErr("업무 내용을 입력하세요."); return; }
    if (!clientId && !factoryId && !projectId) { setErr("업체/공장/프로젝트 중 1개 이상 선택하세요."); return; }
    setBusy(true); setErr("");
    const res = await fetch("/api/work-requests", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, category: category || null, photos, requestDate, startDate: startDate || null, endDate: endDate || null, assigneeId: assigneeId || null, clientId: clientId || null, factoryId: factoryId || null, projectId: projectId || null }),
    });
    setBusy(false);
    if (!res.ok) { setErr("등록에 실패했습니다."); return; }
    setContent(""); setPhotos([]); setPhotos([]); setCategory(""); setStartDate(""); setEndDate(""); setClientId(fixedClientId ?? ""); setFactoryId(fixedFactoryId ?? ""); setProjectId(fixedProjectId ?? ""); setAssigneeId(""); setOpen(false); router.refresh();
  }
  async function remove(id: string) {
    if (!confirm("이 업무요청을 삭제하시겠습니까?")) return;
    await fetch(`/api/work-requests?id=${id}`, { method: "DELETE" });
    router.refresh();
  }

  // 검색 + 단계별(업무구분)·상태 색인
  const [query, setQuery] = useState("");
  const [statusF, setStatusF] = useState<"all" | "open" | "done">("all");
  const [catF, setCatF] = useState<string>("all");
  const [assignF, setAssignF] = useState<string>("all");
  const q = query.trim().toLowerCase();
  const visible = requests.filter((r) => {
    if (statusF === "open" && r.done) return false;
    if (statusF === "done" && !r.done) return false;
    if (catF !== "all" && (r.category ?? "") !== catF) return false;
    if (assignF === "none" && r.assignee) return false;
    if (assignF !== "all" && assignF !== "none" && (r.assignee?.id ?? "") !== assignF) return false;
    if (!q) return true;
    const hay = [r.content, r.category, r.client?.name, r.factory?.name, r.project?.productName, r.assignee?.name, r.requester?.name]
      .filter(Boolean).join(" ").toLowerCase();
    return hay.includes(q);
  });
  const catCount = (c: string) => requests.filter((r) => (r.category ?? "") === c).length;
  const assignees = Array.from(new Map(requests.filter((r) => r.assignee).map((r) => [r.assignee!.id, r.assignee!.name])).entries());
  const assignCount = (id: string) => requests.filter((r) => r.assignee?.id === id).length;
  const noAssignCount = requests.filter((r) => !r.assignee).length;

  return (
    <div className="space-y-3">
      {showFilters && (
        <div className="space-y-2">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="업무 내용 · 업체 · 공장 · 프로젝트 · 담당자 검색" className="h-9 rounded-full pl-9" />
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <Chip active={statusF === "all"} onClick={() => setStatusF("all")}>전체 {requests.length}</Chip>
            <Chip active={statusF === "open"} onClick={() => setStatusF("open")}>요청 {requests.filter((r) => !r.done).length}</Chip>
            <Chip active={statusF === "done"} onClick={() => setStatusF("done")}>완료 {requests.filter((r) => r.done).length}</Chip>
            <span className="mx-1 h-4 w-px bg-border" />
            <Chip active={catF === "all"} onClick={() => setCatF("all")}>구분 전체</Chip>
            {CATEGORIES.map((c) => <Chip key={c} active={catF === c} onClick={() => setCatF(c)}>{c} {catCount(c)}</Chip>)}
          </div>
          {assignees.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <Chip active={assignF === "all"} onClick={() => setAssignF("all")}>담당 전체</Chip>
              {assignees.map(([id, name]) => <Chip key={id} active={assignF === id} onClick={() => setAssignF(id)}>{name} {assignCount(id)}</Chip>)}
              {noAssignCount > 0 && <Chip active={assignF === "none"} onClick={() => setAssignF("none")}>미지정 {noAssignCount}</Chip>}
            </div>
          )}
        </div>
      )}

      {showCreate && (
        <>
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setOpen((o) => !o)}><Plus className="h-4 w-4" /> 업무 추가</Button>
          </div>
          {open && (
            <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {!fixedClientId && (
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">업체</label>
                  <SearchableSelect options={clients} value={clientId} onChange={setClientId} placeholder="업체 검색..." />
                </div>
                )}
                {!fixedFactoryId && (
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">공장</label>
                  <SearchableSelect options={factories} value={factoryId} onChange={setFactoryId} placeholder="공장 검색..." />
                </div>
                )}
                {!fixedProjectId && (
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">프로젝트</label>
                  <SearchableSelect options={projects} value={projectId} onChange={setProjectId} placeholder="프로젝트 검색..." />
                </div>
                )}
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">담당자</label>
                  <select className={selCls} value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
                    <option value="">선택 안함</option>
                    {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex flex-wrap items-end gap-2">
                <div className="w-40">
                  <label className="mb-1 block text-xs text-muted-foreground">업무구분</label>
                  <select className={selCls} value={category} onChange={(e) => setCategory(e.target.value)}>
                    <option value="">선택 안함</option>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="w-36">
                  <label className="mb-1 block text-xs text-muted-foreground">요청일</label>
                  <Input type="date" value={requestDate} onChange={(e) => setRequestDate(e.target.value)} className="h-9" />
                </div>
                <div className="w-36">
                  <label className="mb-1 block text-xs text-muted-foreground">시작일</label>
                  <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-9" />
                </div>
                <div className="w-36">
                  <label className="mb-1 block text-xs text-muted-foreground">완료일</label>
                  <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-9" />
                </div>
                <div className="min-w-[200px] flex-1">
                  <label className="mb-1 block text-xs text-muted-foreground">업무 내용</label>
                  <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="업무 내용 입력..." rows={2} />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">사진 첨부</label>
                <div className="flex flex-wrap items-center gap-2">
                  {photos.map((ph, i) => (
                    <div key={i} className="relative h-16 w-16 overflow-hidden rounded border">
                      <img src={ph} alt="" className="h-full w-full object-cover" />
                      <button type="button" onClick={() => setPhotos((prev) => prev.filter((_, idx) => idx !== i))} className="absolute right-0 top-0 flex h-4 w-4 items-center justify-center bg-black/50 text-[10px] text-white">×</button>
                    </div>
                  ))}
                  <label className="flex h-16 w-16 cursor-pointer items-center justify-center rounded border border-dashed bg-muted/30 text-xs text-muted-foreground hover:bg-accent">
                    {uploading ? "..." : "+ 사진"}
                    <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => uploadPhotos(e.target.files)} />
                  </label>
                </div>
              </div>
              {err && <p className="text-xs text-destructive">{err}</p>}
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={() => { setOpen(false); setErr(""); }}>취소</Button>
                <Button size="sm" onClick={add} disabled={busy}>{busy ? "등록 중..." : "업무 등록"}</Button>
              </div>
            </div>
          )}
        </>
      )}

      <div className="space-y-2">
        {requests.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">등록된 업무가 없습니다.</p>}
        {requests.length > 0 && visible.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">검색/필터에 맞는 업무가 없습니다.</p>}
        {visible.map((r) => <RequestCard key={r.id} req={r} currentUserId={currentUserId} onRemove={remove} />)}
      </div>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={cn("rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
        active ? "border-foreground bg-foreground text-background" : "bg-background hover:bg-accent")}>
      {children}
    </button>
  );
}

function RequestCard({ req, currentUserId, onRemove }: { req: WReq; currentUserId?: string; onRemove: (id: string) => void }) {
  const router = useRouter();
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
  const [uContent, setUContent] = useState("");
  const [uDate, setUDate] = useState(today);
  const [busy, setBusy] = useState(false);
  const [showUpdates, setShowUpdates] = useState(false);

  async function toggleDone(done: boolean) {
    await fetch("/api/work-requests", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: req.id, done }) });
    router.refresh();
  }
  async function addUpdate() {
    if (!uContent.trim()) return;
    setBusy(true);
    await fetch(`/api/work-requests/${req.id}/updates`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: uContent, progressDate: uDate }),
    });
    setBusy(false); setUContent(""); setShowUpdates(true); router.refresh();
  }
  async function delUpdate(id: string) {
    await fetch(`/api/work-requests/${req.id}/updates?updateId=${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className={cn("group rounded-lg border p-3", req.done && "bg-muted/30")}>
      <div className="flex gap-3">
        {req.project?.productPhoto ? (
          <Link href={`/projects/${req.project.id}`} className="block h-24 w-24 shrink-0 overflow-hidden rounded-lg border hover:opacity-80 sm:h-28 sm:w-28">
            <img src={req.project.productPhoto} alt="" loading="lazy" className="h-full w-full object-cover" />
          </Link>
        ) : null}
        <div className="min-w-0 flex-1">
      <div className="mb-1 flex flex-wrap items-center gap-2 text-xs">
        {/* 업무상태 */}
        <span className={cn("inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 font-semibold",
          req.done ? "bg-emerald-100 text-emerald-700" : "bg-orange-100 text-orange-700")}>
          {req.done ? <><CheckCircle2 className="h-3 w-3" />완료</> : "요청"}
        </span>
        {/* 업무구분 */}
        {req.category && <span className={cn("rounded-full px-2 py-0.5 font-medium", CAT_STYLE[req.category] ?? "bg-accent")}>{req.category}</span>}
        {req.client && <Link href={`/clients/${req.client.id}`} className="inline-flex items-center gap-0.5 rounded bg-accent px-1.5 py-0.5 hover:underline"><Building2 className="h-3 w-3" />{req.client.name}</Link>}
        {req.factory && <Link href={`/factories/${req.factory.id}`} className="inline-flex items-center gap-0.5 rounded bg-accent px-1.5 py-0.5 hover:underline"><FactoryIcon className="h-3 w-3" />{req.factory.name}</Link>}
        {req.project && <Link href={`/projects/${req.project.id}`} className="inline-flex items-center gap-0.5 rounded bg-accent px-1.5 py-0.5 hover:underline"><Package className="h-3 w-3" />{req.project.productName}</Link>}
        {req.assignee && <span className="rounded bg-blue-100 px-1.5 py-0.5 font-medium text-blue-700">담당 {req.assignee.name}</span>}
        <div className="ml-auto flex items-center gap-2">
          {req.done
            ? <button onClick={() => toggleDone(false)} className="text-muted-foreground hover:underline">완료취소</button>
            : <label className="flex cursor-pointer items-center gap-1 text-emerald-700"><input type="checkbox" onChange={() => toggleDone(true)} />완료처리</label>}
          <button onClick={() => onRemove(req.id)} className="opacity-0 transition-opacity group-hover:opacity-100">
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </button>
        </div>
      </div>

      <p className="whitespace-pre-wrap text-sm">{req.content}</p>
      {req.photos && (() => { let arr: string[] = []; try { arr = JSON.parse(req.photos); } catch {} return arr.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {arr.map((ph, i) => (
            <a key={i} href={ph} target="_blank" rel="noreferrer" className="block h-16 w-16 overflow-hidden rounded border hover:opacity-80">
              <img src={ph} alt="" loading="lazy" className="h-full w-full object-cover" />
            </a>
          ))}
        </div>
      ) : null; })()}

      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
        <span>요청일 {fmtDate(req.requestDate)}</span>
        {req.startDate && <span>시작일 {fmtDate(req.startDate)}</span>}
        {req.endDate && <span>완료일 {fmtDate(req.endDate)}</span>}
        {req.requester && <span>요청자 {req.requester.name}</span>}
      </div>

      {/* 진행현황 (토글) */}
      <div className="mt-2 border-t pt-2">
        <button onClick={() => setShowUpdates((s) => !s)} className="flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground">
          <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", showUpdates && "rotate-90")} />
          진행현황 {req.updates.length > 0 && `(${req.updates.length})`}
        </button>
        {showUpdates && (
          <div className="mt-1.5 space-y-1.5">
            {req.updates.map((u) => (
              <div key={u.id} className="group/u flex items-start gap-2 rounded bg-muted/30 px-2 py-1.5 text-xs">
                <span className="shrink-0 font-medium text-muted-foreground">{fmtDate(u.progressDate)}</span>
                <span className="flex-1 whitespace-pre-wrap">{u.content}</span>
                {u.createdBy && <span className="shrink-0 text-muted-foreground">{u.createdBy.name}</span>}
                <button onClick={() => delUpdate(u.id)} className="shrink-0 opacity-0 transition-opacity group-hover/u:opacity-100">
                  <Trash2 className="h-3 w-3 text-destructive" />
                </button>
              </div>
            ))}
            <div className="flex items-end gap-1.5">
              <Input type="date" value={uDate} onChange={(e) => setUDate(e.target.value)} className="h-8 w-36 text-xs" />
              <Input value={uContent} onChange={(e) => setUContent(e.target.value)} placeholder="진행현황 입력..." className="h-8 flex-1 text-xs"
                onKeyDown={(e) => { if (e.key === "Enter") addUpdate(); }} />
              <Button size="sm" variant="outline" className="h-8" onClick={addUpdate} disabled={busy}>추가</Button>
            </div>
          </div>
        )}
      </div>
        </div>
      </div>
    </div>
  );
}
