import { ProjectStatus } from "@prisma/client";

// 상태 한글 라벨
export const STATUS_LABEL: Record<ProjectStatus, string> = {
  IN_PROGRESS: "진행중",
  ON_HOLD: "제작보류",
  READY_TO_SHIP: "출고대기",
  DONE: "완료",
  DELAYED: "지연",
  AWAITING_DELIVERY: "인도대기",
};

// 상태 색상 (Tailwind badge variant)
export const STATUS_STYLE: Record<ProjectStatus, string> = {
  IN_PROGRESS: "bg-blue-100 text-blue-700 border-blue-200",
  ON_HOLD: "bg-zinc-100 text-zinc-600 border-zinc-200",
  READY_TO_SHIP: "bg-amber-100 text-amber-700 border-amber-200",
  DONE: "bg-emerald-100 text-emerald-700 border-emerald-200",
  DELAYED: "bg-red-100 text-red-700 border-red-200",
  AWAITING_DELIVERY: "bg-violet-100 text-violet-700 border-violet-200",
};

export const ALL_STATUSES: ProjectStatus[] = [
  "IN_PROGRESS", "ON_HOLD", "READY_TO_SHIP", "DONE", "DELAYED", "AWAITING_DELIVERY",
];

export interface StatusInput {
  manualStatus?: ProjectStatus | string | null;
  manualHold: boolean;
  expectedCompletionDate?: Date | string | null;
  productionCompleteDate?: Date | string | null;
  shipOutDate?: Date | string | null;
  koreaArrivalDate?: Date | string | null;
  customerDeliveryDate?: Date | string | null;
}

const has = (v?: Date | string | null) => v !== null && v !== undefined && v !== "";

/**
 * 상태 계산 규칙
 *  0. 수동 지정(manualStatus)이 있으면 → 그 값 (자동계산보다 우선)
 *  1. 고객인도일 있으면 → 완료
 *  2. 한국도착일 있고 고객인도일 없으면 → 인도대기
 *  3. 생산완료일 있고 출고일 없으면 → 출고대기
 *  4. 완성예정일 지났고 생산완료일 없으면 → 지연
 *  5. 사용자가 제작보류로 설정 → 제작보류
 *  6. 그 외 → 진행중
 */
export function computeStatus(p: StatusInput, today: Date = new Date()): ProjectStatus {
  if (p.manualStatus) return p.manualStatus as ProjectStatus;
  if (has(p.customerDeliveryDate)) return "DONE";
  if (has(p.koreaArrivalDate)) return "AWAITING_DELIVERY";
  if (has(p.productionCompleteDate) && !has(p.shipOutDate)) return "READY_TO_SHIP";

  if (has(p.expectedCompletionDate) && !has(p.productionCompleteDate)) {
    const due = new Date(p.expectedCompletionDate as any);
    const t = new Date(today);
    due.setHours(0, 0, 0, 0);
    t.setHours(0, 0, 0, 0);
    if (due < t) return "DELAYED";
  }

  if (p.manualHold) return "ON_HOLD";
  return "IN_PROGRESS";
}
