import { prisma } from "@/lib/prisma";
import { EntityManager } from "@/components/entity-manager";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const clients = await prisma.client.findMany({
    orderBy: [{ code: "asc" }, { name: "asc" }],
    include: {
      _count: { select: { projects: true } },
      projects: { orderBy: { orderDate: "desc" }, select: { id: true, productName: true, status: true, steps: { select: { name: true, done: true } } } },
    },
  });
  return (
    <div className="space-y-4 p-6">
      <div><h1 className="text-2xl font-bold">업체 관리</h1><p className="text-sm text-muted-foreground">발주 업체(고객사) 목록</p></div>
      <EntityManager
        endpoint="/api/clients" countKey="projects" linkBase="/clients" rows={clients as any} showCode
        fields={[
          { key: "name", label: "업체명", placeholder: "코스메디크", primary: true },
          { key: "representative", label: "대표자" },
          { key: "contact", label: "담당자", primary: true },
          { key: "position", label: "직책" },
          { key: "phone", label: "연락처", primary: true },
          { key: "email", label: "이메일" },
          { key: "bizNo", label: "사업자번호" },
          { key: "region", label: "지역", primary: true },
          { key: "address", label: "주소" },
          { key: "account", label: "계좌" },
          { key: "paymentTerms", label: "결제조건" },
          { key: "memo", label: "메모", textarea: true },
        ]}
      />
    </div>
  );
}
