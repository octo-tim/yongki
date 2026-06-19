import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ProjectForm } from "@/components/project-form";
import { Timeline } from "@/components/timeline";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function EditProjectPage({ params }: { params: { id: string } }) {
  const [project, clients, factories, managers] = await Promise.all([
    prisma.project.findUnique({
      where: { id: params.id },
      include: { steps: { orderBy: [{ type: "asc" }, { order: "asc" }] } },
    }),
    prisma.client.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.factory.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  if (!project) notFound();

  const { steps, ...projectFields } = project as any;
  const prodSteps = steps.filter((s: any) => s.type === "PRODUCTION").map((s: any) => ({ ...s, doneAt: s.doneAt as any }));
  const shipSteps = steps.filter((s: any) => s.type === "SHIPPING").map((s: any) => ({ ...s, doneAt: s.doneAt as any }));

  return (
    <div className="space-y-4 p-6">
      <h1 className="text-2xl font-bold">프로젝트 수정</h1>
      <ProjectForm mode="edit" initial={projectFields} clients={clients} factories={factories} managers={managers} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">제작 / 출고 단계</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-8 md:grid-cols-2">
          <Timeline projectId={project.id} title="제작 단계" steps={prodSteps} accent="bg-blue-500" />
          <Timeline projectId={project.id} title="출고 단계" steps={shipSteps} accent="bg-emerald-500" />
        </CardContent>
      </Card>
    </div>
  );
}
