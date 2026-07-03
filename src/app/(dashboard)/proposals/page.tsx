import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { ProposalManager } from "@/components/proposal-manager";

export const dynamic = "force-dynamic";

export default async function ProposalsPage() {
  const [proposals, clients] = await Promise.all([
    prisma.proposal.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true, title: true, sentDate: true, note: true, fileName: true, fileSize: true, createdAt: true,
        client: { select: { id: true, name: true } }, creator: { select: { name: true } },
      },
    }),
    prisma.client.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <div className="space-y-5 p-6">
      <div>
        <h1 className="text-2xl font-bold">제안서발송</h1>
        <p className="text-sm text-muted-foreground">고객에게 보낸 제안서를 업체별로 모아 관리합니다</p>
      </div>
      <Card>
        <CardContent className="p-4">
          <ProposalManager proposals={proposals as any} clients={clients} />
        </CardContent>
      </Card>
    </div>
  );
}
