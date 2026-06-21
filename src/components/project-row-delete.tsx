"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

export function ProjectRowDelete({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function del(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("이 프로젝트를 삭제하시겠습니까? 되돌릴 수 없습니다.")) return;
    setBusy(true);
    await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
    setBusy(false);
    router.refresh();
  }
  return (
    <button onClick={del} disabled={busy} title="삭제"
      className="text-muted-foreground transition-colors hover:text-destructive disabled:opacity-50">
      <Trash2 className="h-4 w-4" />
    </button>
  );
}
