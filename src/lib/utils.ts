import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function fmtDate(d?: Date | string | null) {
  if (!d) return "-";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "-";
  return date.toISOString().slice(0, 10);
}

export function toDateInput(d?: Date | string | null) {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

export function fmtMoney(v?: number | string | null) {
  if (v === null || v === undefined || v === "") return "-";
  const n = typeof v === "string" ? Number(v) : v;
  if (isNaN(n)) return "-";
  return n.toLocaleString("ko-KR");
}

// 단가·금액 표기: 천단위 콤마 + 소수점 2자리
export function fmtPrice(v?: number | string | null) {
  if (v === null || v === undefined || v === "") return "-";
  const n = typeof v === "string" ? Number(v) : v;
  if (isNaN(n)) return "-";
  return n.toLocaleString("ko-KR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// RMB 등 단가·금액 표시: 소수 최소 2 ~ 최대 4자리 (2.245 → "2.245", 6540 → "6,540.00", 0.245 → "0.245")
export function fmtUnit(v?: number | string | null) {
  if (v === null || v === undefined || v === "") return "-";
  const n = typeof v === "string" ? Number(v) : v;
  if (isNaN(n)) return "-";
  return n.toLocaleString("ko-KR", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
}
