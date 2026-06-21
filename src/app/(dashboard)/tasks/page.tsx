import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { WorkViews } from "@/components/work-views";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const session = await getServerSession(authOptions);
  const myId = (session?.user as any)?.id as string | undefined;
  const [users, clients, factories, projects, requests] = await Promise.all([
    prisma.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.client.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.factory.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.project.findMany({ orderBy: { orderDate: "desc" }, select: { id: true, productName: true } }),
    prisma.workRequest.findMany({
      orderBy: [{ done: "asc" }, { requestDate: "desc" }], take: 300,
      include: {
        requester: { select: { name: true } },
        assignee: { select: { id: true, name: true } },
        client: { select: { id: true, name: true } },
        factory: { select: { id: true, name: true } },
        project: { select: { id: true, productName: true } },
        updates: { orderBy: { progressDate: "asc" }, include: { createdBy: { select: { name: true } } } },
      },
    }),
  ]);

  return (
    <div className="space-y-5 p-6">
      <div>
        <h1 className="text-2xl font-bold">업무</h1>
        <p className="text-sm text-muted-foreground">리스트 · 캘린더 · 칸반 · 구분/상태 색인 · 검색</p>
      </div>
      <WorkViews
        users={users} clients={clients} factories={factories}
        projects={projects.map((p) => ({ id: p.id, name: p.productName }))}
        requests={requests as any} currentUserId={myId} />
    </div>
  );
}
