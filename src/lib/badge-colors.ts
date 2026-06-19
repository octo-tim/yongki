import type { ProjectStatus } from "@prisma/client";

// Tailwind 안전(literal) 팔레트 — 상태 색상 선택지 (클라이언트/서버 공용, 서버 의존성 없음)
export const BADGE_COLORS: Record<string, string> = {
  blue: "bg-blue-100 text-blue-700 border-blue-200",
  zinc: "bg-zinc-100 text-zinc-600 border-zinc-200",
  amber: "bg-amber-100 text-amber-700 border-amber-200",
  emerald: "bg-emerald-100 text-emerald-700 border-emerald-200",
  red: "bg-red-100 text-red-700 border-red-200",
  violet: "bg-violet-100 text-violet-700 border-violet-200",
  sky: "bg-sky-100 text-sky-700 border-sky-200",
  orange: "bg-orange-100 text-orange-700 border-orange-200",
  green: "bg-green-100 text-green-700 border-green-200",
  rose: "bg-rose-100 text-rose-700 border-rose-200",
  slate: "bg-slate-100 text-slate-700 border-slate-200",
  indigo: "bg-indigo-100 text-indigo-700 border-indigo-200",
};

export const BADGE_COLOR_KEYS = Object.keys(BADGE_COLORS);

export const DEFAULT_STATUS_COLOR: Record<ProjectStatus, string> = {
  IN_PROGRESS: "blue",
  ON_HOLD: "zinc",
  READY_TO_SHIP: "amber",
  DONE: "emerald",
  DELAYED: "red",
  AWAITING_DELIVERY: "violet",
};
