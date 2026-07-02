// 대시보드 그룹 공통 로딩 UI — 페이지 이동 즉시 표시되어 체감 속도를 높인다.
export default function Loading() {
  return (
    <div className="animate-pulse space-y-6 p-6">
      <div className="space-y-2">
        <div className="h-7 w-48 rounded-md bg-muted" />
        <div className="h-4 w-72 rounded bg-muted/70" />
      </div>
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-8 w-20 rounded-full bg-muted/70" />
        ))}
      </div>
      <div className="overflow-hidden rounded-lg border">
        <div className="h-11 bg-muted/40" />
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-t px-4 py-3">
            <div className="h-10 w-10 shrink-0 rounded-lg bg-muted/70" />
            <div className="h-4 flex-1 rounded bg-muted/70" />
            <div className="h-4 w-24 rounded bg-muted/60" />
            <div className="h-4 w-16 rounded bg-muted/60" />
          </div>
        ))}
      </div>
    </div>
  );
}
