import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { SalesManager } from "@/components/sales-manager";

export const dynamic = "force-dynamic";

export default async function SalesPage() {
  const [proposals, clients] = await Promise.all([
    prisma.proposal.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true, title: true, productName: true, amount: true, currency: true, status: true,
        docType: true, depositPct: true, sentTo: true, sentAt: true,
        sentDate: true, note: true, fileName: true, fileSize: true, createdAt: true,
        client: { select: { id: true, name: true } }, creator: { select: { name: true } },
      },
    }),
    prisma.client.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <div className="space-y-5 p-6">
      <div>
        <h1 className="text-2xl font-bold">영업관리</h1>
        <p className="text-sm text-muted-foreground">제안서·인보이스를 작성하고 발송 내역을 관리합니다</p>
      </div>
      <Card>
        <CardContent className="p-4">
          <SalesManager proposals={proposals as any} clients={clients} />
        </CardContent>
      </Card>
    </div>
  );
}
