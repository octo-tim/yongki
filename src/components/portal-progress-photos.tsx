/* eslint-disable @next/next/no-img-element */
// 고객 포털용 진행사진 — 보기 전용 (업로드/삭제 불가)
type Photo = Record<string, any>;

function urlOf(p: Photo): string | null {
  return p.photoUrl ?? p.url ?? p.imageUrl ?? p.imagePath ?? p.path ?? p.filePath ?? null;
}
function captionOf(p: Photo): string {
  return p.caption ?? p.note ?? p.description ?? p.memo ?? p.title ?? "";
}

export function PortalProgressPhotos({ photos }: { photos: Photo[] }) {
  const list = (photos ?? []).map((p) => ({ ...p, _url: urlOf(p) })).filter((p) => p._url);
  if (list.length === 0) return <p className="py-4 text-center text-sm text-muted-foreground">등록된 진행사진이 없습니다.</p>;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
      {list.map((p) => (
        <a key={p.id} href={p._url} target="_blank" rel="noreferrer" className="group block">
          <div className="aspect-square overflow-hidden rounded-lg border bg-muted/30">
            <img src={p._url} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
          </div>
          <div className="mt-1 space-y-0.5 px-0.5">
            {captionOf(p) && <p className="truncate text-xs">{captionOf(p)}</p>}
            <p className="text-[11px] text-muted-foreground">{p.createdAt ? new Date(p.createdAt).toISOString().slice(0, 10) : ""}</p>
          </div>
        </a>
      ))}
    </div>
  );
}
