export type WorkStatusKey = "TODO" | "DOING" | "DONE" | "HOLD";

export const WORK_STATUS: { key: WorkStatusKey; label: string; cls: string }[] = [
  { key: "TODO", label: "예정", cls: "bg-slate-100 text-slate-700 border-slate-200" },
  { key: "DOING", label: "진행중", cls: "bg-blue-100 text-blue-700 border-blue-200" },
  { key: "DONE", label: "완료", cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  { key: "HOLD", label: "보류", cls: "bg-amber-100 text-amber-700 border-amber-200" },
];

export const WORK_STATUS_MAP: Record<string, { label: string; cls: string }> =
  Object.fromEntries(WORK_STATUS.map((s) => [s.key, { label: s.label, cls: s.cls }]));
