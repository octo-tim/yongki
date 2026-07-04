"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";

// 대시보드 업로드 파일 확인 버튼 — 누르면 확인 처리되어 목록에서 사라진다.
export function FileCheckButton({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function check() {
    if (!confirm("이 파일을 확인 처리할까요? 대시보드 목록에서 사라집니다.")) return;
    setBusy(true);
    const res = await fetch(`/api/portal/requests/${requestId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileChecked: true }),
    });
    setBusy(false);
    if (res.ok) router.refresh();
    else alert("확인 처리 실패");
  }

  return (
    <button onClick={check} disabled={busy}
      className="flex shrink-0 items-center gap-1 rounded-full border border-emerald-300 px-2 py-1 text-[11px] font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
      title="파일 확인 완료 처리">
      <CheckCircle2 className="h-3 w-3" />{busy ? "처리 중..." : "확인"}
    </button>
  );
}
