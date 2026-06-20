import { prisma } from "@/lib/prisma";
import { ProgressPhotoManager } from "@/components/progress-photo-manager";

export const dynamic = "force-dynamic";

export default async function PhotosPage() {
  const [clients, factories, projectsRaw, photos] = await Promise.all([
    prisma.client.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.factory.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.project.findMany({ orderBy: { orderDate: "desc" }, select: { id: true, productName: true } }),
    prisma.progressPhoto.findMany({
      orderBy: { createdAt: "desc" }, take: 60,
      include: {
        client: { select: { id: true, name: true } },
        factory: { select: { id: true, name: true } },
        project: { select: { id: true, productName: true } },
        createdBy: { select: { name: true } },
      },
    }),
  ]);
  const projects = projectsRaw.map((p) => ({ id: p.id, name: p.productName }));

  return (
    <div className="space-y-5 p-6">
      <div>
        <h1 className="text-2xl font-bold">진행사진</h1>
        <p className="text-sm text-muted-foreground">업체/공장·프로젝트별 진행사진 등록 및 최근 업로드 보기</p>
      </div>
      <ProgressPhotoManager clients={clients} factories={factories} projects={projects} photos={photos as any} />
    </div>
  );
}
