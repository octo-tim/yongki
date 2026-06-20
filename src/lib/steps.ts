import { StepType } from "@prisma/client";

export type StepDef = { type: StepType; group: string; name: string; order: number };

// 표준 단계 (평면 구조)
// 제작일정 관리(PRODUCTION): 공장주문 / 계약금입금(공장) / 파일수령(업체) / 파일전달(공장) / 중간검품 / 생산완료
// 출고관리(SHIPPING): 창고입고 / 검품 / 출고 / 한국도착 / 고객인도
export const CANON_STEPS: StepDef[] = [
  { type: "PRODUCTION", group: "공장주문", name: "공장주문", order: 0 },
  { type: "PRODUCTION", group: "계약금입금(공장)", name: "계약금입금(공장)", order: 1 },
  { type: "PRODUCTION", group: "파일수령(업체)", name: "파일수령(업체)", order: 2 },
  { type: "PRODUCTION", group: "파일전달(공장)", name: "파일전달(공장)", order: 3 },
  { type: "PRODUCTION", group: "중간검품", name: "중간검품", order: 4 },
  { type: "PRODUCTION", group: "생산완료", name: "생산완료", order: 5 },
  { type: "SHIPPING", group: "창고입고", name: "창고입고", order: 0 },
  { type: "SHIPPING", group: "검품", name: "검품", order: 1 },
  { type: "SHIPPING", group: "출고", name: "출고", order: 2 },
  { type: "SHIPPING", group: "한국도착", name: "한국도착", order: 3 },
  { type: "SHIPPING", group: "고객인도", name: "고객인도", order: 4 },
];

// leaf 단계명 → Project 날짜 컬럼 매핑 (엑셀 내보내기/하위호환용 동기화)
export const STEP_TO_PROJECT_DATE: Record<string, string> = {
  공장주문: "factoryOrderDate",
  생산완료: "productionCompleteDate",
  창고입고: "warehouseInDate",
  검품: "inspectionDate",
  출고: "shipOutDate",
  한국도착: "koreaArrivalDate",
  고객인도: "customerDeliveryDate",
};

export function defaultSteps(): StepDef[] {
  return CANON_STEPS.map((s) => ({ ...s }));
}
