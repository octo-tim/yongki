import { prisma } from "@/lib/prisma";
import { EntityManager } from "@/components/entity-manager";

export const dynamic = "force-dynamic";

export default async function FactoriesPage() {
  const factories = await prisma.factory.findMany({
    orderBy: { name: "asc" }, include: { _count: { select: { projects: true } } },
  });
  return (
    <div className="space-y-4 p-6">
      <div><h1 className="text-2xl font-bold">공장 관리</h1><p className="text-sm text-muted-foreground">해외 생산처 목록</p></div>
      <EntityManager
        endpoint="/api/factories" countKey="projects" linkBase="/factories" rows={factories as any}
        fields={[
          { key: "name", label: "공장명", placeholder: "广州 튜브용기 昕鸿", primary: true },
          { key: "region", label: "지역", primary: true },
          { key: "category", label: "품목", primary: true },
          { key: "contactType", label: "소통수단" },
          { key: "contact", label: "공장담당자", primary: true },
          { key: "position", label: "직책" },
          { key: "phone", label: "연락처" },
          { key: "wechat", label: "위챗ID" },
          { key: "email", label: "이메일" },
          { key: "address", label: "주소" },
          { key: "account", label: "계좌" },
          { key: "paymentTerms", label: "결제조건" },
          { key: "memo", label: "메모", textarea: true },
        ]}
      />
    </div>
  );
}
