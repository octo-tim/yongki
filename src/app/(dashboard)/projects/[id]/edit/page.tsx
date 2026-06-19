import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ProjectForm } from "@/components/project-form";

export const dynamic = "force-dynamic";

export default async function EditProjectPage({ params }: { params: { id: string } }) {
  const [project, clients, factories, managers] = await Promise.all([
    prisma.project.findUnique({ where: { id: params.id } }),
    prisma.client.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.factory.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  if (!project) notFound();
  return (
    <div className="space-y-4 p-6">
      <h1 className="text-2xl font-bold">프로젝트 수정</h1>
      <ProjectForm mode="edit" initial={project} clients={clients} factories={factories} managers={managers} />
    </div>
  );
}
