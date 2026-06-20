import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { getStatusConfig } from "@/lib/status-config";
import { StepBoard } from "@/components/step-board";
import { NotePanel } from "@/components/note-panel";
import { WorkLogPanel } from "@/components/worklog-panel";
import { MeetingPanel } from "@/components/meeting-panel";
import { ImportantNotePanel } from "@/components/important-note-panel";
import { ProgressPhotoGrid } from "@/components/progress-photo-grid";
import { RequestPanel } from "@/components/request-panel";
import { WorkRequestPanel } from "@/components/work-request-panel";
import { PaymentManager } from "@/components/payment-manager";
import { ProductInfoPanel } from "@/components/product-info-panel";
import { MemoPanel } from "@/components/memo-panel";
import { FilePanel } from "@/components/file-panel";
import { DeleteProjectButton } from "@/components/delete-project-button";
import { fmtDate, fmtMoney } from "@/lib/utils";
import { Pencil } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ProjectDetailPage({ params }: { params: { id: string } }) {
  const p = await prisma.project.findUnique({
    where: { id: params.id },
    include: {
      client: true, factory: true, manager: true,
      steps: { orderBy: [{ type: "asc" }, { order: "asc" }] },
      files: { orderBy: { createdAt: "desc" } },
      notes: { orderBy: { createdAt: "desc" }, include: { author: true } },
      workLogs: { orderBy: { createdAt: "desc" }, include: { assignee: { select: { id: true, name: true } }, creator: { select: { id: true, name: true } } } },
      meetings: { orderBy: { meetingDate: "desc" }, include: { client: { select: { id: true, name: true } }, factory: { select: { id: true, name: true } }, createdBy: { select: { name: true } }, files: true } },
      clientRequests: { orderBy: { requestDate: "desc" }, include: { createdBy: { select: { name: true } } } },
      progressPhotos: { orderBy: { createdAt: "desc" }, include: { client: { select: { id: true, name: true } }, factory: { select: { id: true, name: true } }, createdBy: { select: { name: true } } } },
      workRequests: { orderBy: { requestDate: "desc" }, include: { requester: { select: { name: true } }, assignee: { select: { id: true, name: true } }, client: { select: { id: true, name: true } }, factory: { select: { id: true, name: true } }, updates: { orderBy: { progressDate: "asc" }, include: { createdBy: { select: { name: true } } } } } },
      payments: { orderBy: { receivedAt: "desc" } },
      products: { orderBy: { createdAt: "asc" } },
      memos: { orderBy: { createdAt: "desc" }, include: { author: true } },
      logs: { orderBy: { createdAt: "desc" }, take: 10, include: { actor: true } },
    },
  });
  if (!p) notFound();
  const statusCfg = await getStatusConfig();
  const [users, clients, factories] = await Promise.all([
    prisma.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.client.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.factory.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  const session = await getServerSession(authOptions);
  const uid = (session?.user as any)?.id as string | undefined;

  const boardSteps = p.steps.map((s) => ({
    id: s.id, type: s.type, group: s.group, name: s.name, order: s.order,
    done: s.done, doneAt: s.doneAt as any, staff: s.staff,
  }));

  const info: [string, string][] = [
    ["주문번호", p.orderNo ?? "-"],
    ["주문일자", fmtDate(p.orderDate)],
    ["수량", fmtMoney(p.quantity)],
    ["판매처", p.client?.name ?? "-"],
    ["구매처", p.factory?.name ?? "-"],
    ["관리책임자", p.manager?.name ?? "-"],
  ];
  // 판매처(업체)/구매처(공장) 표시 필드
  const clientFields: [string, any][] = p.client ? [
    ["대표자", p.client.representative], ["담당자", p.client.contact], ["직책", p.client.position],
    ["연락처", p.client.phone], ["이메일", p.client.email], ["사업자번호", p.client.bizNo],
    ["지역", p.client.region], ["주소", p.client.address], ["계좌", p.client.account], ["결제조건", p.client.paymentTerms],
  ] : [];
  const factoryFields: [string, any][] = p.factory ? [
    ["지역", p.factory.region], ["품목", p.factory.category], ["담당자", p.factory.contact], ["직책", p.factory.position],
    ["연락처", p.factory.phone], ["위챗ID", p.factory.wechat], ["이메일", p.factory.email],
    ["주소", p.factory.address], ["계좌", p.factory.account], ["결제조건", p.factory.paymentTerms],
  ] : [];

  // 제품정보(상품관리 연동) + 결재관리 전체금액 계산
  const prod = p.products[0] ?? null;
  const qty = prod?.quantity ?? 0;
  const salesUnitRmb = prod ? (prod.salesCurrency === "RMB" ? Number(prod.salesPrice ?? 0) : Number(prod.salesPrice ?? 0) * Number(prod.exchangeRate ?? 0)) : 0;
  const paymentTotals = {
    salesTotal: qty * salesUnitRmb,
    purchaseTotal: qty * Number(prod?.supplyPrice ?? 0),
    purchaseCurrency: prod?.supplyCurrency ?? "RMB",
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link href="/projects" className="text-sm text-muted-foreground hover:underline">프로젝트</Link>
            <span className="text-muted-foreground">/</span>
            <StatusBadge status={p.status} label={statusCfg.label[p.status]} colorClass={statusCfg.style[p.status]} />
          </div>
          <h1 className="text-2xl font-bold">{p.productName}</h1>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline"><Link href={`/projects/${p.id}/edit`}><Pencil className="h-4 w-4" /> 수정</Link></Button>
          <DeleteProjectButton projectId={p.id} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* 1. 기본 정보 (맨 위) */}
          <Card>
            <CardHeader><CardTitle className="text-base">기본 정보</CardTitle></CardHeader>
            <CardContent>
              {p.productPhoto && <img src={p.productPhoto} alt="제품" className="mb-4 h-32 rounded border object-cover" />}
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm md:grid-cols-4">
                {info.map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-xs text-muted-foreground">{k}</dt>
                    <dd className="font-medium">{v}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>

          {/* 2. 제품정보 (상품관리 연동) */}
          <Card>
            <CardHeader><CardTitle className="text-base">제품정보</CardTitle></CardHeader>
            <CardContent>
              <ProductInfoPanel
                projectId={p.id}
                projectName={p.productName}
                factoryId={p.factoryId}
                clientId={p.clientId}
                product={prod as any}
              />
            </CardContent>
          </Card>

          {/* 제품제작 중요사항 */}
          <Card>
            <CardHeader><CardTitle className="text-base">제품제작 중요사항</CardTitle></CardHeader>
            <CardContent>
              <ImportantNotePanel projectId={p.id} value={p.importantNote ?? null} />
            </CardContent>
          </Card>

          {/* 2. 진행 단계 */}
          <Card>
            <CardHeader><CardTitle className="text-base">진행 단계</CardTitle></CardHeader>
            <CardContent>
              <StepBoard projectId={p.id} steps={boardSteps} />
            </CardContent>
          </Card>

          {/* 진행사진 */}
          <Card>
            <CardHeader><CardTitle className="text-base">진행사진 ({p.progressPhotos.length})</CardTitle></CardHeader>
            <CardContent>
              <ProgressPhotoGrid photos={p.progressPhotos as any} empty="등록된 진행사진이 없습니다. (진행사진 메뉴에서 등록)" />
            </CardContent>
          </Card>

          {/* 3. 업무관리 */}
          <Card>
            <CardHeader><CardTitle className="text-base">업무관리</CardTitle></CardHeader>
            <CardContent>
              <WorkLogPanel users={users} fixedProjectId={p.id} logs={p.workLogs as any} />
            </CardContent>
          </Card>

          {/* 4. 회의록 */}
          <Card>
            <CardHeader><CardTitle className="text-base">회의록</CardTitle></CardHeader>
            <CardContent>
              <MeetingPanel clients={clients} factories={factories} fixedProjectId={p.id} meetings={p.meetings as any} showProject={false} />
            </CardContent>
          </Card>

          {/* 업무요청 */}
          <Card>
            <CardHeader><CardTitle className="text-base">업무요청</CardTitle></CardHeader>
            <CardContent>
              <WorkRequestPanel requests={p.workRequests as any} currentUserId={uid} showCreate={false} />
            </CardContent>
          </Card>

          {/* 5. 거래처 요청사항 (날짜별) */}
          <Card>
            <CardHeader><CardTitle className="text-base">거래처 요청사항</CardTitle></CardHeader>
            <CardContent>
              <RequestPanel projectId={p.id} requests={p.clientRequests as any} />
            </CardContent>
          </Card>

          {/* 6. 특이사항 (작성자·작성일별 다중 입력) */}
          <Card>
            <CardHeader><CardTitle className="text-base">특이사항</CardTitle></CardHeader>
            <CardContent>
              <NotePanel projectId={p.id} notes={p.notes as any} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {/* 판매처(업체) 정보 */}
          <Card>
            <CardHeader><CardTitle className="text-base">판매처 정보 (업체)</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {p.client ? (
                <dl className="space-y-1.5 text-sm">
                  <div className="flex items-center justify-between border-b pb-1.5">
                    <dt className="text-muted-foreground">업체명</dt>
                    <dd className="font-semibold"><Link href={`/clients/${p.client.id}`} className="hover:underline">{p.client.name}</Link></dd>
                  </div>
                  {clientFields.filter(([, v]) => v).map(([k, v]) => (
                    <div key={k} className="flex items-start justify-between gap-3">
                      <dt className="shrink-0 text-muted-foreground">{k}</dt>
                      <dd className="text-right font-medium">{v}</dd>
                    </div>
                  ))}
                </dl>
              ) : <p className="text-sm text-muted-foreground">수정 화면에서 판매처를 선택하세요.</p>}
            </CardContent>
          </Card>

          {/* 구매처(공장) 정보 */}
          <Card>
            <CardHeader><CardTitle className="text-base">구매처 정보 (공장)</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {p.factory ? (
                <dl className="space-y-1.5 text-sm">
                  <div className="flex items-center justify-between border-b pb-1.5">
                    <dt className="text-muted-foreground">공장명</dt>
                    <dd className="font-semibold"><Link href={`/factories/${p.factory.id}`} className="hover:underline">{p.factory.name}</Link></dd>
                  </div>
                  {factoryFields.filter(([, v]) => v).map(([k, v]) => (
                    <div key={k} className="flex items-start justify-between gap-3">
                      <dt className="shrink-0 text-muted-foreground">{k}</dt>
                      <dd className="text-right font-medium">{v}</dd>
                    </div>
                  ))}
                </dl>
              ) : <p className="text-sm text-muted-foreground">수정 화면에서 구매처를 선택하세요.</p>}
            </CardContent>
          </Card>

          {/* 결재관리 (판매/구매 × 계약금/잔금) */}
          <Card>
            <CardHeader><CardTitle className="text-base">결재관리</CardTitle></CardHeader>
            <CardContent>
              <PaymentManager projectId={p.id} payments={p.payments as any} totals={paymentTotals} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">메모</CardTitle></CardHeader>
            <CardContent>
              <MemoPanel projectId={p.id} memos={p.memos as any} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">첨부 파일</CardTitle></CardHeader>
            <CardContent>
              <FilePanel projectId={p.id} files={p.files as any} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">변경 이력</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {p.logs.length === 0 && <p className="text-sm text-muted-foreground">이력이 없습니다.</p>}
              {p.logs.map((l) => (
                <div key={l.id} className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{l.message}</span>
                  <span> · {fmtDate(l.createdAt)} {l.actor?.name ? `· ${l.actor.name}` : ""}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
