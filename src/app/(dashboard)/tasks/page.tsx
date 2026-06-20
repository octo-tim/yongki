import { prisma } from "@/lib/prisma";
import { TaskManager } from "@/components/task-manager";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const [users, activeProjects, tasks] = await Promise.all([
    prisma.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.project.findMany({ where: { status: "IN_PROGRESS" }, orderBy: { orderDate: "desc" }, select: { id: true, productName: true } }),
    prisma.workLog.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        assignee: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true } },
        project: { select: { id: true, productName: true } },
      },
    }),
  ]);

  return (
    <div className="space-y-5 p-6">
      <div>
        <h1 className="text-2xl font-bold">업무관리</h1>
        <p className="text-sm text-muted-foreground">담당자별 · 프로젝트별 진행업무 관리 (시작일·종료일·상태)</p>
      </div>
      <TaskManager users={users} projects={activeProjects} tasks={tasks as any} />
    </div>
  );
}
