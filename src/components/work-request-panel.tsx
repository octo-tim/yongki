"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SearchableSelect } from "@/components/searchable-select";
import { fmtDate, cn } from "@/lib/utils";
import { Trash2, Plus, Building2, Factory as FactoryIcon, Package, CheckCircle2 } from "lucide-react";

type Update = { id: string; content: string; progressDate: any; createdBy?: { name: string } | null };
type WReq = {
  id: string; content: string; requestDate: any; done?: boolean; requesterId?: string | null;
  requester?: { name: string } | null;
  assignee?: { id: string; name: string } | null;
  client?: { id: string; name: string } | null;
  factory?: { id: string; name: string } | null;
  project?: { id: string; productName: string } | null;
  updates: Update[];
};
type Opt = { id: string; name: string };

const selCls = "h-9 w-full rounded-md border border-input bg-background px-3 text-sm";

export function WorkRequestPanel({
  clients = [], factories = [], projects = [], users = [], requests, currentUserId, showCreate = true,
}: {
  clients?: Opt[]; factories?: Opt[]; projects?: Opt[]; users?: Opt[]; requests: WReq[]; currentUserId?: string; showCreate?: boolean;
}) {
  const router = useRouter();
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
  const [open, setOpen] = useState(false);
  const [clientId, setClientId] = useState("");
  const [factoryId, setFactoryId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [content, setContent] = useState("");
  const [requestDate, setRequestDate] = useState(today);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function add() {
    if (!content.trim()) { setErr("요청사항을 입력하세요."); return; }
    if (!clientId && !factoryId && !projectId) { setErr("업체/공장/프로젝트 중 1개 이상 선택하세요."); return; }
    setBusy(true); setErr("");
    const res = await fetch("/api/work-requests", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, requestDate, assigneeId: assigneeId || null, clientId: clientId || null, factoryId: factoryId || null, projectId: projectId || null }),
    });
    setBusy(false);
    if (!res.ok) { setErr("등록에 실패했습니다."); return; }
    setContent(""); setClientId(""); setFactoryId(""); setProjectId(""); setAssigneeId(""); setOpen(false); router.refresh();
  }
  async function remove(id: string) {
    if (!confirm("이 업무요청을 삭제하시겠습니까?")) return;
    await fetch(`/api/work-requests?id=${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {showCreate && (
        <>
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setOpen((o) => !o)}><Plus className="h-4 w-4" /> 업무요청 추가</Button>
          </div>
          {open && (
            <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">업체</label>
                  <SearchableSelect options={clients} value={clientId} onChange={setClientId} placeholder="업체 검색..." />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">공장</label>
                  <SearchableSelect options={factories} value={factoryId} onChange={setFactoryId} placeholder="공장 검색..." />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">프로젝트</label>
                  <SearchableSelect options={projects} value={projectId} onChange={setProjectId} placeholder="프로젝트 검색..." />
                </div>
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
                  <label className="mb-1 block text-xs text-muted-foreground">요청일</label>
                  <Input type="date" value={requestDate} onChange={(e) => setRequestDate(e.target.value)} className="h-9" />
                </div>
                <div className="min-w-[200px] flex-1">
                  <label className="mb-1 block text-xs text-muted-foreground">요청사항</label>
                  <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="요청 내용 입력..." rows={2} />
                </div>
              </div>
              {err && <p className="text-xs text-destructive">{err}</p>}
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={() => { setOpen(false); setErr(""); }}>취소</Button>
                <Button size="sm" onClick={add} disabled={busy}>{busy ? "등록 중..." : "요청 등록"}</Button>
              </div>
            </div>
          )}
        </>
      )}

      <div className="space-y-2">
        {requests.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">등록된 업무요청이 없습니다.</p>}
        {requests.map((r) => <RequestCard key={r.id} req={r} currentUserId={currentUserId} onRemove={remove} />)}
      </div>
    </div>
  );
}

function RequestCard({ req, currentUserId, onRemove }: { req: WReq; currentUserId?: string; onRemove: (id: string) => void }) {
  const router = useRouter();
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
  const [uContent, setUContent] = useState("");
  const [uDate, setUDate] = useState(today);
  const [busy, setBusy] = useState(false);
  const isRequester = !!currentUserId && currentUserId === req.requesterId;

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
    setBusy(false); setUContent(""); router.refresh();
  }
  async function delUpdate(id: string) {
    await fetch(`/api/work-requests/${req.id}/updates?updateId=${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className={cn("group rounded-lg border p-3", req.done && "bg-muted/30")}>
      <div className="mb-1 flex flex-wrap items-center gap-2 text-xs">
        {req.done && <span className="inline-flex items-center gap-0.5 rounded-full border border-emerald-200 bg-emerald-100 px-2 py-0.5 font-medium text-emerald-700"><CheckCircle2 className="h-3 w-3" />완료</span>}
        {req.client && <Link href={`/clients/${req.client.id}`} className="inline-flex items-center gap-0.5 rounded bg-accent px-1.5 py-0.5 hover:underline"><Building2 className="h-3 w-3" />{req.client.name}</Link>}
        {req.factory && <Link href={`/factories/${req.factory.id}`} className="inline-flex items-center gap-0.5 rounded bg-accent px-1.5 py-0.5 hover:underline"><FactoryIcon className="h-3 w-3" />{req.factory.name}</Link>}
        {req.project && <Link href={`/projects/${req.project.id}`} className="inline-flex items-center gap-0.5 rounded bg-accent px-1.5 py-0.5 hover:underline"><Package className="h-3 w-3" />{req.project.productName}</Link>}
        <span className="text-muted-foreground">· 요청일 {fmtDate(req.requestDate)}</span>
        {req.requester && <span className="text-muted-foreground">· 요청자 {req.requester.name}</span>}
        {req.assignee && <span className="rounded bg-blue-100 px-1.5 py-0.5 font-medium text-blue-700">담당 {req.assignee.name}</span>}
        <div className="ml-auto flex items-center gap-2">
          {isRequester && (
            req.done
              ? <button onClick={() => toggleDone(false)} className="text-muted-foreground hover:underline">완료취소</button>
              : <label className="flex cursor-pointer items-center gap-1 text-emerald-700"><input type="checkbox" onChange={() => toggleDone(true)} />완료</label>
          )}
          <button onClick={() => onRemove(req.id)} className="opacity-0 transition-opacity group-hover:opacity-100">
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </button>
        </div>
      </div>
      <p className="whitespace-pre-wrap text-sm">{req.content}</p>

      <div className="mt-2 space-y-1.5 border-t pt-2">
        <p className="text-xs font-semibold text-muted-foreground">진행현황 {req.updates.length > 0 && `(${req.updates.length})`}</p>
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
    </div>
  );
}
