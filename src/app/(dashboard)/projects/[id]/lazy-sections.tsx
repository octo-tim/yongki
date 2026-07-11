import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fmtDate } from "@/lib/utils";
import { ProgressPhotoGrid } from "@/components/progress-photo-grid";
import { WorkRequestPanel } from "@/components/work-request-panel";
import { MeetingPanel } from "@/components/meeting-panel";
import { RequestPanel } from "@/components/request-panel";
import { NotePanel } from "@/components/note-panel";
import { MemoPanel } from "@/components/memo-panel";
import { PortalRequestPanel } from "@/components/portal-request-panel";
import { InquiryPanel } from "@/components/inquiry-panel";
import { StaffFilePanel } from "@/components/staff-file-panel";
import { FilePanel } from "@/components/file-panel";

type Opt = { id: string; name: string };

// 카드 스켈레톤 (지연 로딩 중 표시)
export function CardSkeleton({ title, lines = 2 }: { title: string; lines?: number }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className="h-4 animate-pulse rounded bg-muted/60" style={{ width: `${90 - i * 15}%` }} />
        ))}
      </CardContent>
    </Card>
  );
}

// ── 진행사진 ──
export async function ProgressPhotosSection({ projectId }: { projectId: string }) {
  const photos = await prisma.progressPhoto.findMany({
    where: { projectId }, orderBy: { createdAt: "desc" },
    include: { client: { select: { id: true, name: true } }, factory: { select: { id: true, name: true } }, createdBy: { select: { name: true } } },
  });
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">진행사진 ({photos.length})</CardTitle></CardHeader>
      <CardContent><ProgressPhotoGrid photos={photos as any} empty="등록된 진행사진이 없습니다. (진행사진 메뉴에서 등록)" /></CardContent>
    </Card>
  );
}

// ── 업무 ──
export async function WorkSection({ projectId, productName, users, clients, factories, uid }: {
  projectId: string; productName: string; users: Opt[]; clients: Opt[]; factories: Opt[]; uid?: string;
}) {
  const requests = await prisma.workRequest.findMany({
    where: { projectId }, orderBy: { requestDate: "desc" },
    include: { requester: { select: { name: true } }, assignee: { select: { id: true, name: true } }, client: { select: { id: true, name: true } }, factory: { select: { id: true, name: true } }, updates: { orderBy: { progressDate: "asc" }, include: { createdBy: { select: { name: true } } } } },
  });
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">업무</CardTitle></CardHeader>
      <CardContent>
        <WorkRequestPanel users={users} clients={clients} factories={factories}
          projects={[{ id: projectId, name: productName }]} fixedProjectId={projectId} requests={requests as any} currentUserId={uid} />
      </CardContent>
    </Card>
  );
}

// ── 회의록 ──
export async function MeetingsSection({ projectId, clients, factories }: { projectId: string; clients: Opt[]; factories: Opt[] }) {
  const meetings = await prisma.meeting.findMany({
    where: { projectId }, orderBy: { meetingDate: "desc" },
    include: { client: { select: { id: true, name: true } }, factory: { select: { id: true, name: true } }, createdBy: { select: { name: true } }, files: true },
  });
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">회의록</CardTitle></CardHeader>
      <CardContent><MeetingPanel clients={clients} factories={factories} fixedProjectId={projectId} meetings={meetings as any} showProject={false} /></CardContent>
    </Card>
  );
}

// ── 거래처 요청사항 ──
export async function ClientRequestsSection({ projectId }: { projectId: string }) {
  const requests = await prisma.clientRequest.findMany({
    where: { projectId }, orderBy: { requestDate: "desc" },
    include: { createdBy: { select: { name: true } } },
  });
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">거래처 요청사항</CardTitle></CardHeader>
      <CardContent><RequestPanel projectId={projectId} requests={requests as any} /></CardContent>
    </Card>
  );
}

// ── 특이사항 ──
export async function NotesSection({ projectId }: { projectId: string }) {
  const notes = await prisma.projectNote.findMany({
    where: { projectId }, orderBy: { createdAt: "desc" },
    include: { author: { select: { id: true, name: true } } },
  });
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">특이사항</CardTitle></CardHeader>
      <CardContent><NotePanel projectId={projectId} notes={notes as any} /></CardContent>
    </Card>
  );
}

// ── 메모 ──
export async function MemosSection({ projectId }: { projectId: string }) {
  const memos = await prisma.projectMemo.findMany({
    where: { projectId }, orderBy: { createdAt: "desc" },
    include: { author: { select: { id: true, name: true } } },
  });
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">메모</CardTitle></CardHeader>
      <CardContent><MemoPanel projectId={projectId} memos={memos as any} /></CardContent>
    </Card>
  );
}

// ── 고객 요청사항 (파트너센터) ──
export async function PortalRequestsSection({ projectId }: { projectId: string }) {
  const requests = await prisma.clientPortalRequest.findMany({
    where: { projectId }, orderBy: { createdAt: "desc" },
    select: { id: true, content: true, status: true, fileName: true, fileSize: true, createdAt: true },
  });
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">고객 요청사항 (파트너센터)</CardTitle></CardHeader>
      <CardContent><PortalRequestPanel projectId={projectId} requests={requests as any} canCreate={false} canManage /></CardContent>
    </Card>
  );
}

// ── 제품제작 문의 및 답변 (파트너센터) ──
export async function InquiriesSection({ projectId, clientId }: { projectId: string; clientId?: string }) {
  const inquiries = await prisma.clientInquiry.findMany({
    where: { projectId }, orderBy: { createdAt: "desc" },
    select: { id: true, subject: true, status: true, createdAt: true, messages: { orderBy: { createdAt: "asc" }, select: { id: true, senderType: true, senderName: true, content: true, createdAt: true } } },
  });
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">제품제작 문의 및 답변 (파트너센터)</CardTitle></CardHeader>
      <CardContent><InquiryPanel projectId={projectId} clientId={clientId} inquiries={inquiries as any} role="STAFF" /></CardContent>
    </Card>
  );
}

// ── 고객 확인요청 파일 (파트너센터) ── (바이너리 data 제외)
export async function StaffFilesSection({ projectId }: { projectId: string }) {
  const files = await prisma.staffFileRequest.findMany({
    where: { projectId }, orderBy: { createdAt: "desc" },
    select: { id: true, title: true, memo: true, fileName: true, fileType: true, fileSize: true, confirmedAt: true, confirmedBy: true, uploaderName: true, createdAt: true },
  });
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">고객 확인요청 파일 (파트너센터)</CardTitle></CardHeader>
      <CardContent><StaffFilePanel projectId={projectId} files={files as any} /></CardContent>
    </Card>
  );
}

// ── 첨부 파일 ──
export async function FilesSection({ projectId }: { projectId: string }) {
  const files = await prisma.projectFile.findMany({
    where: { projectId }, orderBy: { createdAt: "desc" },
    select: { id: true, fileName: true, filePath: true, fileType: true, fileSize: true, createdAt: true },
  });
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">첨부 파일</CardTitle></CardHeader>
      <CardContent><FilePanel projectId={projectId} files={files as any} /></CardContent>
    </Card>
  );
}

// ── 변경 이력 ──
export async function LogsSection({ projectId }: { projectId: string }) {
  const logs = await prisma.projectLog.findMany({
    where: { projectId }, orderBy: { createdAt: "desc" }, take: 10,
    include: { actor: { select: { id: true, name: true } } },
  });
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">변경 이력</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {logs.length === 0 && <p className="text-sm text-muted-foreground">이력이 없습니다.</p>}
        {logs.map((l) => (
          <div key={l.id} className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{l.message}</span>
            <span> · {fmtDate(l.createdAt)} {l.actor?.name ? `· ${l.actor.name}` : ""}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
