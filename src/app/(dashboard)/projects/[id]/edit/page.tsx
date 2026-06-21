import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ProjectForm } from "@/components/project-form";
import { StepTimeline } from "@/components/step-timeline";
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

  return (
    <div className="space-y-4 p-6">
      <h1 className="text-2xl font-bold">프로젝트 수정</h1>
      <ProjectForm mode="edit" initial={projectFields} clients={clients} factories={factories} managers={managers} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">진행 단계 (단계 선택 시 오늘 · 로그인 담당자 자동 기록)</CardTitle>
        </CardHeader>
        <CardContent>
          <StepTimeline projectId={project.id} current={(projectFields as any).status}
            steps={steps.map((s: any) => ({ name: s.name, doneAt: s.doneAt, staff: s.staff, done: s.done }))} />
        </CardContent>
      </Card>
    </div>
  );
}
