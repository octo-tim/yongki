import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureStatusDefaults } from "@/lib/status-config";
import { StatusSettingsManager } from "@/components/status-settings-manager";

export const dynamic = "force-dynamic";

export default async function StatusAdminPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if ((session.user as any).role !== "ADMIN") redirect("/dashboard");

  await ensureStatusDefaults();
  const rows = await prisma.statusSetting.findMany({ orderBy: { sortOrder: "asc" } });

  return (
    <div className="space-y-4 p-6">
      <div>
        <h1 className="text-2xl font-bold">상태 관리</h1>
        <p className="text-sm text-muted-foreground">프로젝트 상태의 표시 이름·색상·순서를 관리합니다 (관리자 전용)</p>
      </div>
      <StatusSettingsManager rows={rows.map((r) => ({ key: r.key, label: r.label, color: r.color, sortOrder: r.sortOrder }))} />
    </div>
  );
}
