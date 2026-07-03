"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, FileText, Trash2, Download } from "lucide-react";
import { cn } from "@/lib/utils";

type Doc = { id: string; title: string; category: string | null; fileName: string; fileSize: number | null; createdAt: string; uploader?: { name: string } | null };

const CATS = ["출고서식", "샘플서식", "영수증", "기타"];

function fmtSize(n: number | null) {
  if (!n) return "-";
  if (n < 1024) return `${n}B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)}KB`;
  return `${(n / 1024 / 1024).toFixed(1)}MB`;
}

export function LibraryManager({ docs }: { docs: Doc[] }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(CATS[0]);
  const [busy, setBusy] = useState(false);
  const [catF, setCatF] = useState("all");

  const cats = Array.from(new Set(docs.map((d) => d.category).filter(Boolean))) as string[];
  const visible = catF === "all" ? docs : docs.filter((d) => d.category === catF);

  async function upload() {
    const file = fileRef.current?.files?.[0];
    if (!file) return alert("파일을 선택하세요");
    setBusy(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("title", title || file.name);
    fd.append("category", category);
    const res = await fetch("/api/library", { method: "POST", body: fd });
    setBusy(false);
    if (res.ok) { setTitle(""); if (fileRef.current) fileRef.current.value = ""; router.refresh(); }
    else alert("업로드 실패");
  }
  async function remove(id: string) {
    if (!confirm("삭제하시겠습니까?")) return;
    const res = await fetch(`/api/library/${id}`, { method: "DELETE" });
    if (res.ok) router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-2 rounded-md border bg-muted/30 p-3 sm:grid-cols-[1fr_auto_auto_auto]">
        <Input placeholder="자료명 (미입력 시 파일명 사용)" value={title} onChange={(e) => setTitle(e.target.value)} className="h-9" />
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="h-9 rounded-md border bg-background px-2 text-sm">
          {CATS.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <input ref={fileRef} type="file" className="h-9 max-w-[220px] rounded-md border bg-background px-2 py-1.5 text-sm file:mr-2 file:rounded file:border-0 file:bg-accent file:px-2 file:py-1 file:text-xs" />
        <Button onClick={upload} disabled={busy}><Upload className="mr-1 h-4 w-4" />{busy ? "업로드 중..." : "업로드"}</Button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <button onClick={() => setCatF("all")} className={cn("rounded-full border px-3 py-1 text-xs", catF === "all" ? "bg-primary text-primary-foreground" : "bg-background")}>전체 {docs.length}</button>
        {cats.map((c) => (
          <button key={c} onClick={() => setCatF(c)} className={cn("rounded-full border px-3 py-1 text-xs", catF === c ? "bg-primary text-primary-foreground" : "bg-background")}>{c} {docs.filter((d) => d.category === c).length}</button>
        ))}
      </div>

      {visible.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
          <FileText className="h-8 w-8 opacity-40" />
          <p className="text-sm">등록된 자료가 없습니다.</p>
        </div>
      )}

      <div className="divide-y rounded-md border">
        {visible.map((d) => (
          <div key={d.id} className="flex items-center gap-3 px-3 py-2.5">
            <a href={`/api/library/${d.id}/download`} target="_blank" rel="noreferrer" className="flex min-w-0 flex-1 items-center gap-2 hover:underline">
              <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="truncate text-sm font-medium">{d.title}</span>
              {d.category && <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">{d.category}</span>}
            </a>
            <span className="shrink-0 text-xs text-muted-foreground">{fmtSize(d.fileSize)}</span>
            <span className="shrink-0 text-xs text-muted-foreground">{d.uploader?.name ?? ""}</span>
            <a href={`/api/library/${d.id}/download`} className="shrink-0 rounded p-1 text-muted-foreground hover:bg-accent"><Download className="h-3.5 w-3.5" /></a>
            <button onClick={() => remove(d.id)} className="shrink-0 rounded p-1 text-muted-foreground hover:bg-accent hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}
