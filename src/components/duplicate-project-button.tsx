"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";

// 프로젝트 복사 버튼 (재주문용) — 복사 후 새 프로젝트 상세로 이동
export function DuplicateProjectButton({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function duplicate() {
    if (!window.confirm("이 프로젝트를 복사해 새 프로젝트로 등록할까요?\n(제품·업체·공장·단가·추가항목이 복사되며, 진행단계·결제·문서는 새로 시작됩니다)")) return;
    setBusy(true);
    const res = await fetch(`/api/projects/${projectId}/duplicate`, { method: "POST" });
    setBusy(false);
    if (res.ok) {
      const j = await res.json();
      router.push(`/projects/${j.id}/edit`);
    } else {
      const j = await res.json().catch(() => ({}));
      alert(j.error || "복사 실패");
    }
  }

  return (
    <Button variant="outline" onClick={duplicate} disabled={busy}>
      <Copy className="h-4 w-4" /> {busy ? "복사 중..." : "복사"}
    </Button>
  );
}
