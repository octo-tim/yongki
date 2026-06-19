import { StepType } from "@prisma/client";

// 타임라인 기본 단계 정의
export const PRODUCTION_STEPS = [
  "공장 주문", "파일 수령", "파일 전달", "생산 시작", "생산 중간 확인", "생산 완료",
];
export const SHIPPING_STEPS = [
  "창고 입고", "검품", "출고", "한국 도착", "고객 인도",
];

export function defaultSteps() {
  const steps: { type: StepType; name: string; order: number }[] = [];
  PRODUCTION_STEPS.forEach((name, i) => steps.push({ type: "PRODUCTION", name, order: i }));
  SHIPPING_STEPS.forEach((name, i) => steps.push({ type: "SHIPPING", name, order: i }));
  return steps;
}
