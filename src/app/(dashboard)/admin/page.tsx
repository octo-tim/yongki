import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureStepDefaults } from "@/lib/step-templates";
import { UserManager } from "@/components/user-manager";
import { StepTemplateManager } from "@/components/step-template-manager";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if ((session.user as any).role !== "ADMIN") redirect("/dashboard");

  await ensureStepDefaults();
  const [users, templates] = await Promise.all([
    prisma.user.findMany({
      orderBy: [{ role: "asc" }, { createdAt: "asc" }],
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    }),
    prisma.stepTemplate.findMany({ orderBy: [{ type: "asc" }, { order: "asc" }] }),
  ]);
  const tpl = templates.map((t) => ({ id: t.id, type: t.type, group: t.group, name: t.name, order: t.order, active: t.active }));

  return (
    <div className="space-y-8 p-6">
      <section className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold">사용자 관리</h1>
          <p className="text-sm text-muted-foreground">로그인 계정 및 권한 관리 (관리자 전용)</p>
        </div>
        <UserManager
          rows={users.map((u) => ({ ...u, createdAt: u.createdAt.toISOString() })) as any}
          currentUserId={(session.user as any).id}
        />
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold">단계 관리</h2>
          <p className="text-sm text-muted-foreground">제작·출고 단계 템플릿(2단계 그룹 · 3단계 하위단계). 신규 프로젝트는 이 템플릿으로 단계가 생성됩니다.</p>
        </div>
        <StepTemplateManager
          production={tpl.filter((r) => r.type === "PRODUCTION")}
          shipping={tpl.filter((r) => r.type === "SHIPPING")}
        />
      </section>
    </div>
  );
}
