"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/searchable-select";
import { Send, FileText, Trash2, Download, Plus, X, Printer } from "lucide-react";
import { cn, fmtUnit } from "@/lib/utils";

type Proposal = {
  id: string; title: string; productName: string | null; amount: any; currency: string | null; status: string;
  sentDate: string | null; note: string | null; fileName: string | null; fileSize: number | null; createdAt: string;
  client?: { id: string; name: string } | null; creator?: { name: string } | null;
};
type Opt = { id: string; name: string };
type Row = { name: string; spec: string; qty: string; unitPrice: string };

const STATUSES = ["발송완료", "검토중", "수주", "무산"];
const statusColor: Record<string, string> = {
  발송완료: "bg-blue-100 text-blue-700", 검토중: "bg-amber-100 text-amber-700",
  수주: "bg-emerald-100 text-emerald-700", 무산: "bg-zinc-200 text-zinc-600",
};
const emptyRow = (): Row => ({ name: "", spec: "", qty: "", unitPrice: "" });

function fmtSize(n: number | null) {
  if (!n) return null;
  if (n < 1024) return `${n}B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)}KB`;
  return `${(n / 1024 / 1024).toFixed(1)}MB`;
}

export function ProposalManager({ proposals, clients, fixedClientId }: { proposals: Proposal[]; clients: Opt[]; fixedClientId?: string }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [rows, setRows] = useState<Row[]>([emptyRow()]);
  const [vatApplied, setVatApplied] = useState(true);
  const [currency, setCurrency] = useState("KRW");
  const [clientId, setClientId] = useState(fixedClientId ?? "");
  const [sentDate, setSentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [validUntil, setValidUntil] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [clientF, setClientF] = useState("all");
  const [statusF, setStatusF] = useState("all");

  const base = fixedClientId ? proposals.filter((p) => p.client?.id === fixedClientId) : proposals;
  const list = statusF === "all" ? base : base.filter((p) => p.status === statusF);
  const visible = clientF === "all" ? list : list.filter((p) => p.client?.id === clientF);
  const usedClients = Array.from(new Map(base.filter((p) => p.client).map((p) => [p.client!.id, p.client!.name])).entries());
  const stCount = (s: string) => base.filter((p) => p.status === s).length;

  const num = (s: string) => (s === "" ? 0 : Number(s) || 0);
  const supply = rows.reduce((a, r) => a + num(r.qty) * num(r.unitPrice), 0);
  const vat = vatApplied ? Math.round(supply * 0.1) : 0;
  const total = supply + vat;

  function setRow(i: number, key: keyof Row, v: string) {
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, [key]: v } : r)));
  }

  async function submit() {
    if (!title.trim()) return alert("제목을 입력하세요");
    setBusy(true);
    const fd = new FormData();
    fd.append("title", title);
    const items = rows.filter((r) => r.name.trim()).map((r) => ({ name: r.name.trim(), spec: r.spec.trim(), qty: num(r.qty), unitPrice: num(r.unitPrice) }));
    if (items.length) {
      fd.append("items", JSON.stringify(items));
      fd.append("productName", items.map((i) => i.name).join(", ").slice(0, 100));
      fd.append("amount", String(total));
    }
    fd.append("vatApplied", String(vatApplied));
    fd.append("currency", currency);
    if (clientId) fd.append("clientId", clientId);
    if (sentDate) fd.append("sentDate", sentDate);
    if (validUntil) fd.append("validUntil", validUntil);
    if (note) fd.append("note", note);
    const file = fileRef.current?.files?.[0];
    if (file) fd.append("file", file);
    const res = await fetch("/api/proposals", { method: "POST", body: fd });
    setBusy(false);
    if (res.ok) {
      const j = await res.json().catch(() => null);
      setTitle(""); setRows([emptyRow()]); setClientId(fixedClientId ?? ""); setNote(""); setValidUntil("");
      if (fileRef.current) fileRef.current.value = "";
      setAdding(false); router.refresh();
      if (j?.id) router.push(`/quote/${j.id}`);
    } else alert("등록 실패");
  }
  async function setStatus(id: string, status: string) {
    const res = await fetch(`/api/proposals/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    if (res.ok) router.refresh();
  }
  async function remove(id: string) {
    if (!confirm("삭제하시겠습니까?")) return;
    const res = await fetch(`/api/proposals/${id}`, { method: "DELETE" });
    if (res.ok) router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1.5">
          <button onClick={() => setStatusF("all")} className={cn("rounded-full border px-3 py-1 text-xs", statusF === "all" ? "bg-primary text-primary-foreground" : "bg-background")}>전체 {base.length}</button>
          {STATUSES.map((s) => (
            <button key={s} onClick={() => setStatusF(s)} className={cn("rounded-full border px-3 py-1 text-xs", statusF === s ? "bg-primary text-primary-foreground" : "bg-background")}>{s} {stCount(s)}</button>
          ))}
        </div>
        {!fixedClientId && usedClients.length > 0 && (
          <select value={clientF} onChange={(e) => setClientF(e.target.value)} className="h-8 rounded-md border bg-background px-2 text-xs">
            <option value="all">업체 전체</option>
            {usedClients.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
        )}
        <div className="flex-1" />
        <Button size="sm" onClick={() => setAdding((v) => !v)}>{adding ? <X className="mr-1 h-4 w-4" /> : <Plus className="mr-1 h-4 w-4" />}{adding ? "닫기" : "견적서 작성"}</Button>
      </div>

      {adding && (
        <div className="space-y-2 rounded-md border bg-muted/30 p-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <Input placeholder="제목 * (예: [미소코스] 25파이 튜브용기 견적)" value={title} onChange={(e) => setTitle(e.target.value)} className="h-9" />
            {!fixedClientId ? (
              <SearchableSelect options={clients} value={clientId} onChange={setClientId} placeholder="업체 선택" className="h-9" />
            ) : <div className="hidden sm:block" />}
          </div>

          {/* 견적 항목 */}
          <div className="overflow-x-auto rounded-md border bg-background">
            <table className="w-full text-xs">
              <thead className="bg-muted/40">
                <tr>
                  <th className="px-2 py-1.5 text-left">품목 *</th>
                  <th className="w-24 px-2 py-1.5 text-left">규격</th>
                  <th className="w-20 px-2 py-1.5">수량</th>
                  <th className="w-28 px-2 py-1.5">단가</th>
                  <th className="w-28 px-2 py-1.5 text-right">공급가액</th>
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-t">
                    <td className="p-1"><input value={r.name} onChange={(e) => setRow(i, "name", e.target.value)} placeholder="품목명" className="w-full bg-transparent px-1 py-1 outline-none" /></td>
                    <td className="p-1"><input value={r.spec} onChange={(e) => setRow(i, "spec", e.target.value)} placeholder="-" className="w-full bg-transparent px-1 py-1 outline-none" /></td>
                    <td className="p-1"><input type="number" value={r.qty} onChange={(e) => setRow(i, "qty", e.target.value)} className="w-full bg-transparent px-1 py-1 text-right outline-none" /></td>
                    <td className="p-1"><input type="number" step="any" value={r.unitPrice} onChange={(e) => setRow(i, "unitPrice", e.target.value)} className="w-full bg-transparent px-1 py-1 text-right outline-none" /></td>
                    <td className="p-1 text-right tabular-nums">{(num(r.qty) * num(r.unitPrice)).toLocaleString()}</td>
                    <td className="p-1 text-center">
                      {rows.length > 1 && <button onClick={() => setRows((rs) => rs.filter((_, idx) => idx !== i))} className="text-muted-foreground hover:text-destructive"><X className="h-3.5 w-3.5" /></button>}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t bg-muted/20 font-medium">
                <tr><td colSpan={4} className="px-2 py-1.5 text-right">공급가액</td><td className="px-2 py-1.5 text-right tabular-nums">{supply.toLocaleString()}</td><td /></tr>
                <tr><td colSpan={4} className="px-2 py-1.5 text-right">부가세 (10%)</td><td className="px-2 py-1.5 text-right tabular-nums">{vatApplied ? vat.toLocaleString() : "-"}</td><td /></tr>
                <tr className="font-bold"><td colSpan={4} className="px-2 py-1.5 text-right">합계</td><td className="px-2 py-1.5 text-right tabular-nums">{total.toLocaleString()}</td><td /></tr>
              </tfoot>
            </table>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button onClick={() => setRows((rs) => [...rs, emptyRow()])} className="flex items-center gap-1 text-xs text-primary hover:underline"><Plus className="h-3.5 w-3.5" />항목 추가</button>
            <label className="flex items-center gap-1.5 text-xs"><input type="checkbox" checked={vatApplied} onChange={(e) => setVatApplied(e.target.checked)} />부가세 10% 적용</label>
            <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="h-8 rounded-md border bg-background px-2 text-xs">
              <option>KRW</option><option>RMB</option><option>USD</option>
            </select>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <div className="flex items-center gap-1">
              <span className="w-14 shrink-0 text-xs text-muted-foreground">견적일</span>
              <Input type="date" value={sentDate} onChange={(e) => setSentDate(e.target.value)} className="h-9" />
            </div>
            <div className="flex items-center gap-1">
              <span className="w-14 shrink-0 text-xs text-muted-foreground">유효기간</span>
              <Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} className="h-9" />
            </div>
          </div>
          <Input placeholder="비고 (결제조건, 납기 등)" value={note} onChange={(e) => setNote(e.target.value)} className="h-9" />
          <div className="flex items-center gap-2">
            <input ref={fileRef} type="file" className="h-9 flex-1 rounded-md border bg-background px-2 py-1.5 text-sm file:mr-2 file:rounded file:border-0 file:bg-accent file:px-2 file:py-1 file:text-xs" />
            <Button size="sm" variant="outline" onClick={() => setAdding(false)}>취소</Button>
            <Button size="sm" onClick={submit} disabled={busy}>{busy ? "등록 중..." : "등록 후 견적서 보기"}</Button>
          </div>
        </div>
      )}

      {visible.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
          <Send className="h-8 w-8 opacity-40" />
          <p className="text-sm">등록된 견적서가 없습니다.</p>
        </div>
      )}

      <div className="divide-y rounded-md border">
        {visible.map((p) => (
          <div key={p.id} className="flex items-start gap-3 px-3 py-2.5">
            <Send className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Link href={`/quote/${p.id}`} className="text-sm font-medium hover:underline">{p.title}</Link>
                {p.client && !fixedClientId && <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[11px] text-violet-700">{p.client.name}</span>}
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                {p.productName && <span>품목: {p.productName}</span>}
                {p.amount != null && <span className="font-medium text-foreground">{fmtUnit(Number(p.amount))} {p.currency ?? "KRW"}</span>}
                {p.sentDate && <span>견적일 {new Date(p.sentDate).toISOString().slice(0, 10)}</span>}
                {p.creator?.name && <span>{p.creator.name}</span>}
              </div>
              {p.note && <p className="mt-0.5 text-xs text-muted-foreground">{p.note}</p>}
              {p.fileName && (
                <a href={`/api/proposals/${p.id}/download`} target="_blank" rel="noreferrer" className="mt-1 flex w-fit items-center gap-1 text-xs text-blue-600 hover:underline">
                  <FileText className="h-3 w-3" />{p.fileName} {fmtSize(p.fileSize) && `(${fmtSize(p.fileSize)})`}
                </a>
              )}
            </div>
            <Link href={`/quote/${p.id}`} className="shrink-0 rounded p-1 text-muted-foreground hover:bg-accent" title="견적서 보기/인쇄"><Printer className="h-3.5 w-3.5" /></Link>
            <select value={p.status} onChange={(e) => setStatus(p.id, e.target.value)} className={cn("shrink-0 rounded-full border-0 px-2 py-1 text-xs font-medium", statusColor[p.status] ?? "bg-muted")}>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            {p.fileName && <a href={`/api/proposals/${p.id}/download`} className="shrink-0 rounded p-1 text-muted-foreground hover:bg-accent"><Download className="h-3.5 w-3.5" /></a>}
            <button onClick={() => remove(p.id)} className="shrink-0 rounded p-1 text-muted-foreground hover:bg-accent hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}
