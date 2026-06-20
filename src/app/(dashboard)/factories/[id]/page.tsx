import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getStatusConfig } from "@/lib/status-config";
import { Card, CardContent } from "@/components/ui/card";
import { EntityProjects } from "@/components/entity-projects";
import { ProgressPhotoGrid } from "@/components/progress-photo-grid";

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
    },
  });
  if (!factory) notFound();
  const statusCfg = await getStatusConfig();

  const meta = [factory.region, (factory as any).category, (factory as any).contactType].filter(Boolean).join(" · ");

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
          <EntityProjects projects={factory.projects as any} statusCfg={statusCfg as any} />
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
