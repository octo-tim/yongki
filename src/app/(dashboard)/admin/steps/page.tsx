import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureStepDefaults } from "@/lib/step-templates";
import { StepTemplateManager } from "@/components/step-template-manager";

export const dynamic = "force-dynamic";

export default async function StepsAdminPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if ((session.user as any).role !== "ADMIN") redirect("/dashboard");

  await ensureStepDefaults();
  const templates = await prisma.stepTemplate.findMany({ orderBy: [{ type: "asc" }, { order: "asc" }] });
  const rows = templates.map((t) => ({ id: t.id, type: t.type, name: t.name, order: t.order, active: t.active }));

  return (
    <div className="space-y-4 p-6">
      <div>
        <h1 className="text-2xl font-bold">단계 관리</h1>
        <p className="text-sm text-muted-foreground">제작·출고 단계(하위 업무) 템플릿을 관리합니다. 신규 프로젝트는 이 템플릿으로 단계가 생성됩니다 (관리자 전용)</p>
      </div>
      <StepTemplateManager
        production={rows.filter((r) => r.type === "PRODUCTION")}
        shipping={rows.filter((r) => r.type === "SHIPPING")}
      />
    </div>
  );
}
