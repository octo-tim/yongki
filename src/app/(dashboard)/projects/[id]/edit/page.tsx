import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ProjectForm } from "@/components/project-form";
import { StepBoard } from "@/components/step-board";
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
  const boardSteps = steps.map((s: any) => ({
    id: s.id, type: s.type, group: s.group, name: s.name, order: s.order,
    done: s.done, doneAt: s.doneAt as any, staff: s.staff,
  }));

  return (
    <div className="space-y-4 p-6">
      <h1 className="text-2xl font-bold">프로젝트 수정</h1>
      <ProjectForm mode="edit" initial={projectFields} clients={clients} factories={factories} managers={managers} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">진행 단계 (일자 · 직원)</CardTitle>
        </CardHeader>
        <CardContent>
          <StepBoard projectId={project.id} steps={boardSteps} />
        </CardContent>
      </Card>
    </div>
  );
}
