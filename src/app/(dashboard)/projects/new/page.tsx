import { prisma } from "@/lib/prisma";
import { ProjectForm } from "@/components/project-form";

export const dynamic = "force-dynamic";

export default async function NewProjectPage() {
  const [clients, factories, managers] = await Promise.all([
    prisma.client.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.factory.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  return (
    <div className="space-y-4 p-6">
      <h1 className="text-2xl font-bold">프로젝트 등록</h1>
      <ProjectForm mode="create" clients={clients} factories={factories} managers={managers} />
    </div>
  );
}
