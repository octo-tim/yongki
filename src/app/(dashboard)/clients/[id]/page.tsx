import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStatusConfig } from "@/lib/status-config";
import { Card, CardContent } from "@/components/ui/card";
import { EntityProjects } from "@/components/entity-projects";
import { ProgressPhotoGrid } from "@/components/progress-photo-grid";
import { WorkRequestPanel } from "@/components/work-request-panel";
import { ProposalManager } from "@/components/proposal-manager";

export const dynamic = "force-dynamic";

export default async function ClientDetailPage({ params }: { params: { id: string } }) {
  const client = await prisma.client.findUnique({
    where: { id: params.id },
    include: {
      projects: {
        orderBy: { orderDate: "desc" },
        include: { steps: { orderBy: [{ type: "asc" }, { order: "asc" }] } },
      },
      progressPhotos: {
        orderBy: { createdAt: "desc" },
        include: { factory: { select: { id: true, name: true } }, project: { select: { id: true, productName: true } }, createdBy: { select: { name: true } } },
      },
      workRequests: {
        orderBy: { requestDate: "desc" },
        include: { requester: { select: { name: true } }, assignee: { select: { id: true, name: true } }, factory: { select: { id: true, name: true } }, project: { select: { id: true, productName: true } }, updates: { orderBy: { progressDate: "asc" }, include: { createdBy: { select: { name: true } } } } },
      },
    },
  });
  if (!client) notFound();
  const statusCfg = await getStatusConfig();
  const session = await getServerSession(authOptions);
  const uid = (session?.user as any)?.id as string | undefined;
  const [users, factories, projects, proposals] = await Promise.all([
    prisma.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.factory.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.project.findMany({ orderBy: { orderDate: "desc" }, select: { id: true, productName: true } }),
    prisma.proposal.findMany({
      where: { clientId: client.id }, orderBy: { createdAt: "desc" },
      select: { id: true, title: true, sentDate: true, note: true, fileName: true, fileSize: true, createdAt: true, client: { select: { id: true, name: true } }, creator: { select: { name: true } } },
    }),
  ]);

  return (
    <div className="space-y-5 p-6">
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/clients" className="hover:underline">업체 관리</Link>
          <span>/</span>
        </div>
        <h1 className="text-2xl font-bold">{(client as any).code ? `#${(client as any).code} ` : ""}{client.name}</h1>
        <p className="text-sm text-muted-foreground">
          전체 프로젝트 {client.projects.length}건
          {client.contact ? ` · 담당자 ${client.contact}` : ""}{client.phone ? ` · ${client.phone}` : ""}
        </p>
      </div>

      <Card>
        <CardContent className="p-4">
          <h2 className="mb-3 text-sm font-semibold">기본 정보</h2>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm md:grid-cols-4">
            {([["대표자", (client as any).representative], ["담당자", client.contact], ["직책", (client as any).position], ["연락처", client.phone], ["이메일", (client as any).email], ["사업자번호", (client as any).bizNo], ["지역", (client as any).region], ["주소", (client as any).address], ["계좌", (client as any).account], ["결제조건", (client as any).paymentTerms], ["메모", client.memo]] as [string, any][]).map(([k, v]) => (
              <div key={k} className={k === "메모" ? "col-span-2 md:col-span-4" : ""}>
                <dt className="text-xs text-muted-foreground">{k}</dt>
                <dd className="font-medium">{v || "-"}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <EntityProjects projects={client.projects as any} statusCfg={statusCfg as any} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <h2 className="mb-3 text-sm font-semibold">업무 (이 업체 · 프로젝트 무관 포함)</h2>
          <WorkRequestPanel requests={client.workRequests as any} currentUserId={uid}
            showCreate fixedClientId={client.id}
            users={users} factories={factories}
            projects={projects.map((p) => ({ id: p.id, name: p.productName }))} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <h2 className="mb-3 text-sm font-semibold">제안서발송 ({proposals.length})</h2>
          <ProposalManager proposals={proposals as any} clients={[]} fixedClientId={client.id} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <h2 className="mb-3 text-sm font-semibold">진행사진 ({client.progressPhotos.length})</h2>
          <ProgressPhotoGrid photos={client.progressPhotos as any} />
        </CardContent>
      </Card>
    </div>
  );
}
