import { StepType } from "@prisma/client";

export type StepDef = { type: StepType; status: string; group: string; name: string; order: number };

// 4상태(준비·진행중·출고대기·완료) / 13단계 구조
// 상태는 단계 진행에서 자동 도출되며, 단계 그룹명 = 상태명
// 제작일정 관리(PRODUCTION): [준비] 고객의뢰·공장주문·계약금입금(공장)  [진행중] 파일수령(업체)·파일전달(공장)·중간검품·생산완료
// 출고관리(SHIPPING):       [출고대기] 창고입고·검품·출고·한국도착        [완료] 고객인도
export const CANON_STEPS: StepDef[] = [
  { type: "PRODUCTION", status: "준비",   group: "준비",   name: "고객의뢰",         order: 0 },
  { type: "PRODUCTION", status: "준비",   group: "준비",   name: "공장주문",         order: 1 },
  { type: "PRODUCTION", status: "준비",   group: "준비",   name: "계약금입금(공장)",  order: 2 },
  { type: "PRODUCTION", status: "진행중", group: "진행중", name: "파일수령(업체)",    order: 3 },
  { type: "PRODUCTION", status: "진행중", group: "진행중", name: "파일전달(공장)",    order: 4 },
  { type: "PRODUCTION", status: "진행중", group: "진행중", name: "중간검품",         order: 5 },
  { type: "PRODUCTION", status: "진행중", group: "진행중", name: "생산완료",         order: 6 },
  { type: "SHIPPING",   status: "출고대기", group: "출고대기", name: "창고입고",      order: 0 },
  { type: "SHIPPING",   status: "출고대기", group: "출고대기", name: "검품",         order: 1 },
  { type: "SHIPPING",   status: "출고대기", group: "출고대기", name: "출고",         order: 2 },
  { type: "SHIPPING",   status: "출고대기", group: "출고대기", name: "한국도착",      order: 3 },
  { type: "SHIPPING",   status: "완료",     group: "완료",     name: "고객인도",     order: 4 },
];

// 전체 진행 순서 (PRODUCTION 0..6 → SHIPPING 0..4)
export const STEP_ORDER: string[] = [
  "고객의뢰", "공장주문", "계약금입금(공장)",
  "파일수령(업체)", "파일전달(공장)", "중간검품", "생산완료",
  "창고입고", "검품", "출고", "한국도착",
  "고객인도",
];

const STEP_STATUS: Record<string, string> = Object.fromEntries(CANON_STEPS.map((s) => [s.name, s.status]));

// leaf 단계명 → Project 날짜 컬럼 매핑 (엑셀 내보내기/하위호환 동기화)
export const STEP_TO_PROJECT_DATE: Record<string, string> = {
  공장주문: "factoryOrderDate",
  생산완료: "productionCompleteDate",
  창고입고: "warehouseInDate",
  검품: "inspectionDate",
  출고: "shipOutDate",
  한국도착: "koreaArrivalDate",
  고객인도: "customerDeliveryDate",
};

// 단계 진행 상태로부터 프로젝트 상태(준비/진행중/출고대기/완료) 도출
// '가장 멀리 진행된(완료된) 단계'의 그룹 기준 — 중간에 빈 단계가 있어도 실제 진척을 반영
export function statusFromSteps(steps: { name: string; done: boolean }[]): string {
  const doneSet = new Set(steps.filter((s) => s.done).map((s) => s.name));
  if (doneSet.has("고객인도")) return "완료";
  for (let i = STEP_ORDER.length - 1; i >= 0; i--) {
    const name = STEP_ORDER[i];
    if (name === "고객인도") continue;
    if (doneSet.has(name)) return STEP_STATUS[name]; // 준비 / 진행중 / 출고대기
  }
  return "준비"; // 완료된 단계 없음
}

export function defaultSteps(): StepDef[] {
  return CANON_STEPS.map((s) => ({ ...s }));
}
