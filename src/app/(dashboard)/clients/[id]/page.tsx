import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getStatusConfig } from "@/lib/status-config";
import { Card, CardContent } from "@/components/ui/card";
import { EntityProjects } from "@/components/entity-projects";
import { ProgressPhotoGrid } from "@/components/progress-photo-grid";

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
    },
  });
  if (!client) notFound();
  const statusCfg = await getStatusConfig();

  return (
    <div className="space-y-5 p-6">
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/clients" className="hover:underline">업체 관리</Link>
          <span>/</span>
        </div>
        <h1 className="text-2xl font-bold">{client.name}</h1>
        <p className="text-sm text-muted-foreground">
          전체 프로젝트 {client.projects.length}건
          {client.contact ? ` · 담당자 ${client.contact}` : ""}{client.phone ? ` · ${client.phone}` : ""}
        </p>
      </div>

      <Card>
        <CardContent className="p-4">
          <h2 className="mb-3 text-sm font-semibold">기본 정보</h2>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm md:grid-cols-4">
            {([["담당자", client.contact], ["연락처", client.phone], ["지역", (client as any).region], ["계좌", (client as any).account], ["메모", client.memo]] as [string, any][]).map(([k, v]) => (
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
          <h2 className="mb-3 text-sm font-semibold">진행사진 ({client.progressPhotos.length})</h2>
          <ProgressPhotoGrid photos={client.progressPhotos as any} />
        </CardContent>
      </Card>
    </div>
  );
}
