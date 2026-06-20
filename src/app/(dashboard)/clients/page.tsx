import { prisma } from "@/lib/prisma";
import { EntityManager } from "@/components/entity-manager";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const clients = await prisma.client.findMany({
    orderBy: { name: "asc" }, include: { _count: { select: { projects: true } } },
  });
  return (
    <div className="space-y-4 p-6">
      <div><h1 className="text-2xl font-bold">업체 관리</h1><p className="text-sm text-muted-foreground">발주 업체(고객사) 목록</p></div>
      <EntityManager
        endpoint="/api/clients" countKey="projects" linkBase="/clients" rows={clients as any}
        fields={[
          { key: "name", label: "업체명", placeholder: "코스메디크" },
          { key: "contact", label: "담당자" },
          { key: "phone", label: "연락처" },
          { key: "region", label: "지역" },
          { key: "account", label: "계좌" },
          { key: "memo", label: "메모" },
        ]}
      />
    </div>
  );
}
