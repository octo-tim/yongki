"use client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { fmtDate, cn } from "@/lib/utils";
import { Trash2, Building2, Factory as FactoryIcon, Package } from "lucide-react";

export type ProgressPhotoItem = {
  id: string; path: string; caption?: string | null; createdAt: any;
  client?: { id: string; name: string } | null;
  factory?: { id: string; name: string } | null;
  project?: { id: string; productName: string } | null;
  createdBy?: { name: string } | null;
};

export function ProgressPhotoGrid({ photos, deletable = true, showLinks = true, empty = "등록된 진행사진이 없습니다." }: {
  photos: ProgressPhotoItem[]; deletable?: boolean; showLinks?: boolean; empty?: string;
}) {
  const router = useRouter();
  async function remove(id: string) {
    if (!confirm("이 사진을 삭제하시겠습니까?")) return;
    await fetch(`/api/progress-photos?id=${id}`, { method: "DELETE" });
    router.refresh();
  }
  if (photos.length === 0) return <p className="py-6 text-center text-sm text-muted-foreground">{empty}</p>;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
      {photos.map((p) => (
        <div key={p.id} className="group overflow-hidden rounded-lg border bg-background">
          <a href={p.path} target="_blank" rel="noreferrer" className="block aspect-square overflow-hidden bg-muted">
            <img src={p.path} alt={p.caption ?? ""} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
          </a>
          <div className="space-y-1 p-2">
            {p.caption && <p className="line-clamp-2 text-xs">{p.caption}</p>}
            {showLinks && (
              <div className="flex flex-wrap gap-1">
                {p.client && <Link href={`/clients/${p.client.id}`} className="inline-flex items-center gap-0.5 rounded bg-accent px-1.5 py-0.5 text-[10px] hover:underline"><Building2 className="h-2.5 w-2.5" />{p.client.name}</Link>}
                {p.factory && <Link href={`/factories/${p.factory.id}`} className="inline-flex items-center gap-0.5 rounded bg-accent px-1.5 py-0.5 text-[10px] hover:underline"><FactoryIcon className="h-2.5 w-2.5" />{p.factory.name}</Link>}
                {p.project && <Link href={`/projects/${p.project.id}`} className="inline-flex items-center gap-0.5 rounded bg-accent px-1.5 py-0.5 text-[10px] hover:underline"><Package className="h-2.5 w-2.5" />{p.project.productName}</Link>}
              </div>
            )}
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span>{fmtDate(p.createdAt)}{p.createdBy ? ` · ${p.createdBy.name}` : ""}</span>
              {deletable && (
                <button onClick={() => remove(p.id)} className="opacity-0 transition-opacity group-hover:opacity-100">
                  <Trash2 className="h-3 w-3 text-destructive" />
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
