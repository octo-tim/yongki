import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { STEP_ORDER } from "@/lib/steps";
import { Card, CardContent } from "@/components/ui/card";
import { PortalProgress } from "@/components/portal-progress";
import { PortalRequestPanel } from "@/components/portal-request-panel";
import { PortalFileConfirm } from "@/components/portal-file-confirm";
import { PortalPayments } from "@/components/portal-payments";
import { PortalProgressPhotos } from "@/components/portal-progress-photos";
import { InquiryPanel } from "@/components/inquiry-panel";
import { ArrowLeft, Package, AlertTriangle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PortalProjectDetail({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const clientId = (session!.user as any).clientId as string;

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    select: {
      id: true, productName: true, productPhoto: true, orderNo: true, orderDate: true, shipRequestDate: true,
      quantity: true, importantNote: true, status: true, clientId: true,
      steps: { select: { name: true, done: true, doneAt: true } },
      factory: { select: { name: true } },
      payments: { where: { side: "SALES" }, select: { id: true, type: true, amount: true, receivedAt: true, method: true } },
      progressPhotos: { orderBy: { createdAt: "desc" } },
      portalRequests: { orderBy: { createdAt: "desc" }, select: { id: true, content: true, status: true, fileName: true, fileSize: true, createdAt: true } },
      staffFiles: { orderBy: { createdAt: "desc" }, select: { id: true, title: true, memo: true, fileName: true, fileSize: true, confirmedAt: true, confirmedBy: true, createdAt: true } },
      inquiries: {
        orderBy: { createdAt: "desc" },
        select: { id: true, subject: true, status: true, createdAt: true, messages: { orderBy: { createdAt: "asc" }, select: { id: true, senderType: true, senderName: true, content: true, createdAt: true } } },
      },
    },
  });
  if (!project || project.clientId !== clientId) notFound();

  const curStep = (() => {
    if (project.status && STEP_ORDER.includes(project.status)) return project.status;
    for (let i = STEP_ORDER.length - 1; i >= 0; i--) if (project.steps.some((s) => s.name === STEP_ORDER[i] && s.done)) return STEP_ORDER[i];
    return STEP_ORDER[0];
  })();

  return (
    <div className="space-y-5">
      <Link href="/portal" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />목록으로</Link>

      {/* 1. 제품정보 */}
      <Card>
        <CardContent className="flex gap-4 p-4">
          <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg border bg-muted/30">
            {project.productPhoto ? <img src={project.productPhoto} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center"><Package className="h-8 w-8 text-muted-foreground/40" /></div>}
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <h1 className="text-lg font-bold">{project.productName}</h1>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-muted-foreground sm:grid-cols-3">
              <span>주문번호: {project.orderNo ?? "-"}</span>
              <span>수량: {project.quantity?.toLocaleString() ?? "-"}</span>
              <span>완료예정일: {project.shipRequestDate ? new Date(project.shipRequestDate).toISOString().slice(0, 10) : "-"}</span>
            </div>
            {project.orderDate && <p className="text-xs text-muted-foreground">주문일자: {new Date(project.orderDate).toISOString().slice(0, 10)}</p>}
          </div>
        </CardContent>
      </Card>

      {/* 제품제작 후가공내역 및 중요체크사항 — 항상 표시 */}
      <Card className="border-amber-300 bg-amber-50/60">
        <CardContent className="p-4">
          <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-amber-800">
            <AlertTriangle className="h-4 w-4" />제품제작 후가공내역 및 중요체크사항
          </h2>
          {project.importantNote ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-amber-900">{project.importantNote}</p>
          ) : (
            <p className="text-sm text-amber-700/60">등록된 내용이 없습니다.</p>
          )}
        </CardContent>
      </Card>

      {/* 진행현황 */}
      <Card>
        <CardContent className="p-4">
          <h2 className="mb-3 text-sm font-semibold">프로젝트 진행현황 <span className="font-normal text-muted-foreground">— 현재: {curStep}</span></h2>
          <PortalProgress steps={project.steps as any} currentStep={curStep} />
        </CardContent>
      </Card>

      {/* 결재관리 (읽기 전용) */}
      <Card>
        <CardContent className="p-4">
          <h2 className="mb-3 text-sm font-semibold">결재관리</h2>
          <PortalPayments payments={project.payments as any} />
        </CardContent>
      </Card>

      {/* 진행사진 (읽기 전용) */}
      <Card>
        <CardContent className="p-4">
          <h2 className="mb-3 text-sm font-semibold">진행사진 ({(project as any).progressPhotos?.length ?? 0})</h2>
          <PortalProgressPhotos photos={(project as any).progressPhotos ?? []} />
        </CardContent>
      </Card>

      {/* 요청 및 파일 올리기 */}
      <Card>
        <CardContent className="p-4">
          <h2 className="mb-3 text-sm font-semibold">고객 확인요청 파일</h2>
          <PortalFileConfirm files={(project as any).staffFiles ?? []} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <h2 className="mb-3 text-sm font-semibold">제품제작 관련 요청 및 파일 올리기</h2>
          <PortalRequestPanel projectId={project.id} requests={project.portalRequests as any} canCreate />
        </CardContent>
      </Card>

      {/* 문의 및 답변 */}
      <Card>
        <CardContent className="p-4">
          <h2 className="mb-3 text-sm font-semibold">제품제작 문의 및 답변</h2>
          <InquiryPanel projectId={project.id} clientId={clientId} inquiries={project.inquiries as any} role="CLIENT" />
        </CardContent>
      </Card>
    </div>
  );
}
