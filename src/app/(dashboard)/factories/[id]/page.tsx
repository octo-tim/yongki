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
          <h2 className="mb-3 text-sm font-semibold">기본 정보</h2>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm md:grid-cols-4">
            {([["지역", factory.region], ["품목", (factory as any).category], ["소통수단", (factory as any).contactType], ["공장담당자", (factory as any).contact], ["직책", (factory as any).position], ["연락처", (factory as any).phone], ["위챗ID", (factory as any).wechat], ["이메일", (factory as any).email], ["주소", (factory as any).address], ["계좌", (factory as any).account], ["결제조건", (factory as any).paymentTerms], ["메모", factory.memo]] as [string, any][]).map(([k, v]) => (
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
