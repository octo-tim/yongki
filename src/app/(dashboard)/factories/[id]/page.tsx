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
import { FactoryInfoEditor } from "@/components/factory-info-editor";

export const dynamic = "force-dynamic";

export default async function FactoryDetailPage({ params }: { params: { id: string } }) {
  const factory = await prisma.factory.findUnique({
    where: { id: params.id },
    include: {
      projects: {
        orderBy: { orderDate: "desc" },
        include: { steps: { orderBy: [{ type: "asc" }, { order: "asc" }] } },
      },
      progressPhotos: {
        orderBy: { createdAt: "desc" },
        include: { client: { select: { id: true, name: true } }, project: { select: { id: true, productName: true } }, createdBy: { select: { name: true } } },
      },
      workRequests: {
        orderBy: { requestDate: "desc" },
        include: { requester: { select: { name: true } }, assignee: { select: { id: true, name: true } }, client: { select: { id: true, name: true } }, project: { select: { id: true, productName: true } }, updates: { orderBy: { progressDate: "asc" }, include: { createdBy: { select: { name: true } } } } },
      },
    },
  });
  if (!factory) notFound();
  const statusCfg = await getStatusConfig();
  const session = await getServerSession(authOptions);
  const uid = (session?.user as any)?.id as string | undefined;

  const meta = [factory.region, (factory as any).mainProducts, (factory as any).contactType].filter(Boolean).join(" · ");

  return (
    <div className="space-y-5 p-6">
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/factories" className="hover:underline">공장 관리</Link>
          <span>/</span>
        </div>
        <h1 className="text-2xl font-bold">{factory.name}</h1>
        <p className="text-sm text-muted-foreground">
          전체 프로젝트 {factory.projects.length}건{meta ? ` · ${meta}` : ""}
        </p>
      </div>

      <Card>
        <CardContent className="p-4">
          <FactoryInfoEditor factory={factory as any} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <EntityProjects projects={factory.projects as any} statusCfg={statusCfg as any} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <h2 className="mb-3 text-sm font-semibold">업무요청</h2>
          <WorkRequestPanel requests={factory.workRequests as any} currentUserId={uid} showCreate={false} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <h2 className="mb-3 text-sm font-semibold">진행사진 ({factory.progressPhotos.length})</h2>
          <ProgressPhotoGrid photos={factory.progressPhotos as any} />
        </CardContent>
      </Card>
    </div>
  );
}
