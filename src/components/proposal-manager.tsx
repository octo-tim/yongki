"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/searchable-select";
import { Send, FileText, Trash2, Download, Plus, X, Printer, Receipt, Mail } from "lucide-react";
import { cn, fmtUnit } from "@/lib/utils";
import { ProposalEditDialog } from "@/components/proposal-edit-dialog";

type Proposal = {
  id: string; title: string; productName: string | null; amount: any; currency: string | null; status: string;
  docType?: string | null; depositPct?: number | null; sentTo?: string | null; sentAt?: string | null; sourceId?: string | null; revisionNo?: number | null; vatApplied?: boolean | null; items?: any;
  sentDate: string | null; note: string | null; fileName: string | null; fileSize: number | null; createdAt: string;
  client?: { id: string; name: string } | null; creator?: { name: string } | null;
};
type Opt = { id: string; name: string };
type Row = { name: string; spec: string; qty: string; unitPrice: string; remark: string; photo: string };

const STATUSES = ["발송완료", "검토중", "수주", "무산"];
const statusColor: Record<string, string> = {
  발송완료: "bg-blue-100 text-blue-700", 검토중: "bg-amber-100 text-amber-700",
  수주: "bg-emerald-100 text-emerald-700", 무산: "bg-zinc-200 text-zinc-600",
};
const emptyRow = (): Row => ({ name: "", spec: "", qty: "", unitPrice: "", remark: "", photo: "" });

function fmtSize(n: number | null) {
  if (!n) return null;
  if (n < 1024) return `${n}B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)}KB`;
  return `${(n / 1024 / 1024).toFixed(1)}MB`;
}

export function ProposalManager({ proposals, clients, fixedClientId, docType }: {
  proposals: Proposal[]; clients: Opt[]; fixedClientId?: string; docType?: "PROPOSAL" | "INVOICE";
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const isInvoice = docType === "INVOICE";
  const docLabel = isInvoice ? "인보이스" : "제안서";

  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [rows, setRows] = useState<Row[]>([emptyRow()]);
  const [vatApplied, setVatApplied] = useState(isInvoice);
  const [depositPct, setDepositPct] = useState("30");
  const [currency, setCurrency] = useState("KRW");
  const [clientId, setClientId] = useState(fixedClientId ?? "");
  const [sentDate, setSentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [validUntil, setValidUntil] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [clientF, setClientF] = useState("all");
  const [statusF, setStatusF] = useState("all");

  const typed = docType ? proposals.filter((p) => (p.docType ?? "PROPOSAL") === docType) : proposals;
  const base = fixedClientId ? typed.filter((p) => p.client?.id === fixedClientId) : typed;
  const list = statusF === "all" ? base : base.filter((p) => p.status === statusF);
  const visible = clientF === "all" ? list : list.filter((p) => p.client?.id === clientF);
  const usedClients = Array.from(new Map(base.filter((p) => p.client).map((p) => [p.client!.id, p.client!.name])).entries());
  const stCount = (s: string) => base.filter((p) => p.status === s).length;

  const num = (s: string) => (s === "" ? 0 : Number(s) || 0);
  const supply = rows.reduce((a, r) => a + num(r.qty) * num(r.unitPrice), 0);
  const vat = vatApplied ? Math.round(supply * 0.1) : 0;
  const total = supply + vat;
  const depPct = Math.min(100, Math.max(0, num(depositPct) || 30));
  const deposit = Math.round((total * depPct) / 100);

  function setRow(i: number, key: keyof Row, v: string) {
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, [key]: v } : r)));
  }

  async function setPhoto(i: number, file: File | null) {
    if (!file) return;
    // 캔버스로 축소(가로 최대 320px)하여 data URL로 저장 → 문서에 임베드
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();
      reader.onload = () => { img.src = String(reader.result); };
      reader.onerror = reject;
      img.onload = () => {
        const max = 320;
        const scale = Math.min(1, max / img.width);
        const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
        const c = document.createElement("canvas");
        c.width = w; c.height = h;
        const ctx = c.getContext("2d");
        if (!ctx) return reject(new Error("canvas"));
        ctx.drawImage(img, 0, 0, w, h);
        resolve(c.toDataURL("image/jpeg", 0.8));
      };
      img.onerror = reject;
      reader.readAsDataURL(file);
    });
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, photo: dataUrl } : r)));
  }

  async function submit() {
    if (!title.trim()) return alert("제목을 입력하세요");
    setBusy(true);
    const fd = new FormData();
    fd.append("title", title);
    fd.append("docType", docType ?? "PROPOSAL");
    fd.append("depositPct", String(depPct));
    const items = rows.filter((r) => r.name.trim()).map((r) => ({ name: r.name.trim(), spec: r.spec.trim(), qty: num(r.qty), unitPrice: num(r.unitPrice), remark: r.remark.trim(), photo: r.photo || undefined }));
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
  async function issueInvoice(p: Proposal) {
    if (!confirm(`'${p.title}' 제안서로 인보이스를 발행할까요?\n(항목·업체·금액이 그대로 복사되며, 제안서는 '수주' 처리됩니다)`)) return;
    const res = await fetch(`/api/proposals/${p.id}/to-invoice`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
    if (res.ok) { const j = await res.json(); router.refresh(); router.push(`/quote/${j.id}`); }
    else { const j = await res.json().catch(() => ({})); alert(j.error || "발행 실패"); }
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
      </div>


      {visible.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
          {isInvoice ? <Receipt className="h-8 w-8 opacity-40" /> : <Send className="h-8 w-8 opacity-40" />}
          <p className="text-sm">등록된 {docLabel}가 없습니다.</p>
        </div>
      )}

      <div className="divide-y rounded-md border">
        {visible.map((p) => (
          <div key={p.id} className="flex items-start gap-3 px-3 py-2.5">
            {(p.docType ?? "PROPOSAL") === "INVOICE" ? <Receipt className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" /> : <Send className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" />}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Link href={`/quote/${p.id}`} className="text-sm font-medium hover:underline">{p.title}</Link>
                {p.client && !fixedClientId && <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[11px] text-violet-700">{p.client.name}</span>}
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                {p.productName && <span>품목: {p.productName}</span>}
                {p.amount != null && <span className="font-medium text-foreground">{fmtUnit(Number(p.amount))} {p.currency ?? "KRW"}</span>}
                {p.sentDate && <span>작성 {new Date(p.sentDate).toISOString().slice(0, 10)}</span>}
                {p.sentTo && <span className="flex items-center gap-0.5 text-blue-600"><Mail className="h-3 w-3" />{p.sentTo}{p.sentAt ? ` (${new Date(p.sentAt).toISOString().slice(0, 10)})` : ""}</span>}
                {p.creator?.name && <span>{p.creator.name}</span>}
              </div>
              {p.note && <p className="mt-0.5 text-xs text-muted-foreground">{p.note}</p>}
              {p.fileName && (
                <a href={`/api/proposals/${p.id}/download`} target="_blank" rel="noreferrer" className="mt-1 flex w-fit items-center gap-1 text-xs text-blue-600 hover:underline">
                  <FileText className="h-3 w-3" />{p.fileName} {fmtSize(p.fileSize) && `(${fmtSize(p.fileSize)})`}
                </a>
              )}
            </div>
            {(p.docType ?? "PROPOSAL") === "PROPOSAL" && (() => {
              const inv = proposals.find((x) => (x.docType ?? "PROPOSAL") === "INVOICE" && x.sourceId === p.id);
              return inv ? (
                <Link href={`/quote/${inv.id}`} className="flex shrink-0 items-center gap-1 rounded-full bg-rose-100 px-2 py-1 text-[11px] font-medium text-rose-700 hover:bg-rose-200" title="발행된 인보이스 보기"><Receipt className="h-3 w-3" />인보이스</Link>
              ) : (
                <button onClick={() => issueInvoice(p)} className="flex shrink-0 items-center gap-1 rounded-full border border-rose-300 px-2 py-1 text-[11px] font-medium text-rose-600 hover:bg-rose-50" title="이 제안서로 인보이스 발행"><Receipt className="h-3 w-3" />인보이스 발행</button>
              );
            })()}
            <ProposalEditDialog proposal={p as any} clients={clients} />
            <Link href={`/quote/${p.id}`} className="shrink-0 rounded p-1 text-muted-foreground hover:bg-accent" title="문서 보기/인쇄/메일"><Printer className="h-3.5 w-3.5" /></Link>
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
