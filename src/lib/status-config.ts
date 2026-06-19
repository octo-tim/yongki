import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { STATUS_LABEL, STATUS_STYLE, ALL_STATUSES } from "@/lib/status";
import type { ProjectStatus } from "@prisma/client";
import { BADGE_COLORS, DEFAULT_STATUS_COLOR } from "@/lib/badge-colors";

export type StatusConfig = {
  label: Record<string, string>;
  style: Record<string, string>;
  order: ProjectStatus[];
};

// 요청당 1회만 DB 조회 (React cache). 비어있으면 정적 기본값 사용.
export const getStatusConfig = cache(async (): Promise<StatusConfig> => {
  const label: Record<string, string> = { ...STATUS_LABEL };
  const style: Record<string, string> = { ...STATUS_STYLE };
  let order: ProjectStatus[] = [...ALL_STATUSES];
  try {
    const rows = await prisma.statusSetting.findMany({ orderBy: { sortOrder: "asc" } });
    if (rows.length > 0) {
      order = [];
      for (const r of rows) {
        label[r.key] = r.label;
        style[r.key] = BADGE_COLORS[r.color] ?? STATUS_STYLE[r.key as ProjectStatus] ?? "";
        if (ALL_STATUSES.includes(r.key as ProjectStatus)) order.push(r.key as ProjectStatus);
      }
      for (const s of ALL_STATUSES) if (!order.includes(s)) order.push(s);
    }
  } catch {
    /* DB 미반영/오류 시 정적 기본값 유지 */
  }
  return { label, style, order };
});

// 관리 화면용: 6개 상태 설정이 없으면 기본값으로 초기화
export async function ensureStatusDefaults() {
  const count = await prisma.statusSetting.count();
  if (count === 0) {
    await prisma.statusSetting.createMany({
      data: ALL_STATUSES.map((s, i) => ({ key: s, label: STATUS_LABEL[s], color: DEFAULT_STATUS_COLOR[s], sortOrder: i })),
    });
  }
}
