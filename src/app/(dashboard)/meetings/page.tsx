import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { MeetingPanel } from "@/components/meeting-panel";

export const dynamic = "force-dynamic";

export default async function MeetingsPage() {
  const [clients, projects, meetings] = await Promise.all([
    prisma.client.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.project.findMany({ orderBy: { orderDate: "desc" }, select: { id: true, productName: true } }),
    prisma.meeting.findMany({
      orderBy: { meetingDate: "desc" },
      include: {
        client: { select: { id: true, name: true } },
        project: { select: { id: true, productName: true } },
        createdBy: { select: { name: true } },
      },
    }),
  ]);

  return (
    <div className="space-y-5 p-6">
      <div>
        <h1 className="text-2xl font-bold">회의록</h1>
        <p className="text-sm text-muted-foreground">내부회의 · 외부회의 기록 (외부회의는 거래처 지정)</p>
      </div>
      <Card>
        <CardContent className="p-4">
          <MeetingPanel clients={clients} projects={projects} meetings={meetings as any} />
        </CardContent>
      </Card>
    </div>
  );
}
