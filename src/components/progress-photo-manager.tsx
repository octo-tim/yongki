"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SearchableSelect } from "@/components/searchable-select";
import { ProgressPhotoGrid, ProgressPhotoItem } from "@/components/progress-photo-grid";
import { cn } from "@/lib/utils";
import { Paperclip, X } from "lucide-react";

type Opt = { id: string; name: string };

export function ProgressPhotoManager({ clients, factories, projects, photos }: {
  clients: Opt[]; factories: Opt[]; projects: Opt[]; photos: ProgressPhotoItem[];
}) {
  const router = useRouter();
  const [target, setTarget] = useState<"CLIENT" | "FACTORY">("CLIENT");
  const [clientId, setClientId] = useState("");
  const [factoryId, setFactoryId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [caption, setCaption] = useState("");
  const [pending, setPending] = useState<{ name: string; path: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function onPick(list: FileList | null) {
    if (!list || list.length === 0) return;
    setUploading(true); setErr("");
    const added: { name: string; path: string }[] = [];
    for (const f of Array.from(list)) {
      const fd = new FormData(); fd.append("file", f);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (res.ok) { const d = await res.json(); added.push({ name: f.name, path: d.path }); }
    }
    setPending((p) => [...p, ...added]);
    setUploading(false);
  }

  async function submit() {
    if (pending.length === 0) { setErr("사진을 먼저 업로드하세요."); return; }
    if (!clientId && !factoryId && !projectId) { setErr("업체/공장 또는 프로젝트를 1개 이상 선택하세요."); return; }
    setBusy(true); setErr("");
    const res = await fetch("/api/progress-photos", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        photos: pending, caption,
        clientId: target === "CLIENT" ? clientId : null,
        factoryId: target === "FACTORY" ? factoryId : null,
        projectId: projectId || null,
      }),
    });
    setBusy(false);
    if (!res.ok) { setErr("등록에 실패했습니다."); return; }
    setPending([]); setCaption(""); setClientId(""); setFactoryId(""); setProjectId(""); router.refresh();
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader><CardTitle className="text-base">진행사진 등록</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {/* 업로드 */}
          <div className="space-y-2">
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-3 py-2 text-sm hover:bg-accent">
              <Paperclip className="h-4 w-4" /> 사진 선택 (여러 장 가능)
              <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => { onPick(e.target.files); e.target.value = ""; }} />
            </label>
            {uploading && <span className="ml-2 text-xs text-muted-foreground">업로드 중...</span>}
            {pending.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {pending.map((f, i) => (
                  <div key={i} className="relative h-20 w-20 overflow-hidden rounded-md border">
                    <img src={f.path} alt="" className="h-full w-full object-cover" />
                    <button onClick={() => setPending((p) => p.filter((_, j) => j !== i))}
                      className="absolute right-0.5 top-0.5 rounded-full bg-black/50 p-0.5"><X className="h-3 w-3 text-white" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 대상 선택 */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <div className="mb-1 flex items-center gap-2">
                <span className="text-xs text-muted-foreground">대상</span>
                <div className="flex rounded-md border p-0.5 text-xs">
                  {(["CLIENT", "FACTORY"] as const).map((tk) => (
                    <button key={tk} type="button" onClick={() => setTarget(tk)}
                      className={cn("rounded px-2.5 py-0.5", target === tk ? "bg-foreground text-background" : "")}>
                      {tk === "CLIENT" ? "업체" : "공장"}
                    </button>
                  ))}
                </div>
              </div>
              {target === "CLIENT"
                ? <SearchableSelect options={clients} value={clientId} onChange={setClientId} placeholder="업체 검색..." />
                : <SearchableSelect options={factories} value={factoryId} onChange={setFactoryId} placeholder="공장 검색..." />}
            </div>
            <div>
              <span className="mb-1 block text-xs text-muted-foreground">프로젝트</span>
              <SearchableSelect options={projects} value={projectId} onChange={setProjectId} placeholder="프로젝트 검색..." />
            </div>
          </div>

          <Input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="설명 (선택)" />
          {err && <p className="text-xs text-destructive">{err}</p>}
          <div className="flex justify-end">
            <Button onClick={submit} disabled={busy || uploading}>{busy ? "등록 중..." : `등록${pending.length ? ` (${pending.length}장)` : ""}`}</Button>
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-muted-foreground">최근 진행사진</h2>
        <ProgressPhotoGrid photos={photos} />
      </div>
    </div>
  );
}
