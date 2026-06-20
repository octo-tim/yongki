// 프로젝트 상태: 단계 진행에서 자동 도출되는 4종 (값 = 라벨 = 단계 그룹명)
export type ProjectStatus = "준비" | "진행중" | "출고대기" | "완료";

export const ALL_STATUSES: ProjectStatus[] = ["준비", "진행중", "출고대기", "완료"];

export const STATUS_LABEL: Record<string, string> = {
  준비: "준비",
  진행중: "진행중",
  출고대기: "출고대기",
  완료: "완료",
};

export const STATUS_STYLE: Record<string, string> = {
  준비: "bg-slate-100 text-slate-700 border-slate-200",
  진행중: "bg-blue-100 text-blue-700 border-blue-200",
  출고대기: "bg-amber-100 text-amber-700 border-amber-200",
  완료: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

export { statusFromSteps } from "@/lib/steps";
