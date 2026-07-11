"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";

// 파트너센터 확인사항 항목 확인 버튼 — 요청/문의를 확인 처리하면 대시보드 목록에서 사라진다.
export function PartnerConfirmButton({ kind, id }: { kind: "request" | "inquiry"; id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function confirm() {
    if (!window.confirm("확인 처리할까요? 파트너센터 확인사항 목록에서 사라집니다.")) return;
    setBusy(true);
    const url = kind === "request" ? `/api/portal/requests/${id}` : `/api/portal/inquiries/${id}`;
    const body = kind === "request" ? { status: "처리완료", fileChecked: true } : { status: "답변완료" };
    const res = await fetch(url, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setBusy(false);
    if (res.ok) router.refresh();
    else alert("확인 처리 실패");
  }

  return (
    <button onClick={confirm} disabled={busy}
      className="flex shrink-0 items-center gap-1 rounded-full border border-emerald-300 px-2 py-1 text-[11px] font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
      title="확인 완료 처리">
      <CheckCircle2 className="h-3 w-3" />{busy ? "처리 중..." : "확인"}
    </button>
  );
}
