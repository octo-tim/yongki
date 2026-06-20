import { prisma } from "@/lib/prisma";
import { ProductManager } from "@/components/product-manager";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const [products, projects, factories, clients] = await Promise.all([
    prisma.product.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        project: { select: { id: true, productName: true } },
        factory: { select: { id: true, name: true } },
        client: { select: { id: true, name: true } },
      },
    }),
    prisma.project.findMany({ orderBy: { orderDate: "desc" }, select: { id: true, productName: true } }),
    prisma.factory.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.client.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  const projectOpts = projects.map((p) => ({ id: p.id, name: p.productName }));

  return (
    <div className="space-y-4 p-6">
      <div>
        <h1 className="text-2xl font-bold">품목관리</h1>
        <p className="text-sm text-muted-foreground">공급단가·판매단가 관리 · 총 {products.length}건</p>
      </div>
      <ProductManager
        products={products as any}
        projects={projectOpts}
        factories={factories}
        clients={clients}
      />
    </div>
  );
}
