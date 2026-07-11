import { ProjectSalesPanel } from "@/components/project-sales-panel";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StepSelect } from "@/components/step-select";
import { StepTimeline } from "@/components/step-timeline";
import { NotePanel } from "@/components/note-panel";
import { MeetingPanel } from "@/components/meeting-panel";
import { ImportantNotePanel } from "@/components/important-note-panel";
import { ProgressPhotoGrid } from "@/components/progress-photo-grid";
import { RequestPanel } from "@/components/request-panel";
import { WorkRequestPanel } from "@/components/work-request-panel";
import { PaymentManager } from "@/components/payment-manager";
import { ProductInfoPanel } from "@/components/product-info-panel";
import { PurchaseCostPanel } from "@/components/purchase-cost-panel";
import { MemoPanel } from "@/components/memo-panel";
import { FilePanel } from "@/components/file-panel";
import { StaffFilePanel } from "@/components/staff-file-panel";
import { PortalRequestPanel } from "@/components/portal-request-panel";
import { InquiryPanel } from "@/components/inquiry-panel";
import { DeleteProjectButton } from "@/components/delete-project-button";
import { fmtDate } from "@/lib/utils";
import { Pencil } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ProjectDetailPage({ params }: { params: { id: string } }) {
  const p = await prisma.project.findUnique({
    where: { id: params.id },
    include: {
      client: true, factory: true, manager: true,
      steps: { orderBy: [{ type: "asc" }, { order: "asc" }] },
      files: { orderBy: { createdAt: "desc" }, select: { id: true, fileName: true, filePath: true, fileType: true, fileSize: true, createdAt: true } },
      proposals: { orderBy: { createdAt: "desc" }, select: { id: true, title: true, docType: true, invoiceKind: true, amount: true, currency: true, status: true, sentDate: true, sentTo: true } },
      staffFiles: { orderBy: { createdAt: "desc" }, select: { id: true, title: true, memo: true, fileName: true, fileType: true, fileSize: true, confirmedAt: true, confirmedBy: true, uploaderName: true, createdAt: true } },
      portalRequests: { orderBy: { createdAt: "desc" }, select: { id: true, content: true, status: true, fileName: true, fileSize: true, createdAt: true } },
      inquiries: {
        orderBy: { createdAt: "desc" },
        select: { id: true, subject: true, status: true, createdAt: true, messages: { orderBy: { createdAt: "asc" }, select: { id: true, senderType: true, senderName: true, content: true, createdAt: true } } },
      },
      notes: { orderBy: { createdAt: "desc" }, include: { author: { select: { id: true, name: true } } } },
      meetings: { orderBy: { meetingDate: "desc" }, include: { client: { select: { id: true, name: true } }, factory: { select: { id: true, name: true } }, createdBy: { select: { name: true } }, files: true } },
      clientRequests: { orderBy: { requestDate: "desc" }, include: { createdBy: { select: { name: true } } } },
      progressPhotos: { orderBy: { createdAt: "desc" }, include: { client: { select: { id: true, name: true } }, factory: { select: { id: true, name: true } }, createdBy: { select: { name: true } } } },
      workRequests: { orderBy: { requestDate: "desc" }, include: { requester: { select: { name: true } }, assignee: { select: { id: true, name: true } }, client: { select: { id: true, name: true } }, factory: { select: { id: true, name: true } }, updates: { orderBy: { progressDate: "asc" }, include: { createdBy: { select: { name: true } } } } } },
      payments: { orderBy: { receivedAt: "desc" } },
      products: { orderBy: { createdAt: "asc" } },
      costItems: { orderBy: { createdAt: "asc" } },
      memos: { orderBy: { createdAt: "desc" }, include: { author: { select: { id: true, name: true } } } },
      logs: { orderBy: { createdAt: "desc" }, take: 10, include: { actor: { select: { id: true, name: true } } } },
    },
  });
  if (!p) notFound();
  const [users, clients, factories, session] = await Promise.all([
    prisma.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.client.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.factory.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    getServerSession(authOptions),
  ]);
  const uid = (session?.user as any)?.id as string | undefined;

  const info: [string, string][] = [
    ["주문번호", p.orderNo ?? "-"],
    ["주문일자", fmtDate(p.orderDate)],
    ["완료예정일", fmtDate(p.shipRequestDate)],
    ["구매처(공장)", p.factory?.name ?? "-"],
    ["주문업체(업체)", p.client?.name ?? "-"],
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
  const productPurchase = qty * Number(prod?.supplyPrice ?? 0);
  const purchaseExtras = (p.costItems ?? []).filter((c: any) => (c.side ?? "PURCHASE") === "PURCHASE").reduce((a: number, c: any) => a + Number(c.amount ?? 0), 0);
  const salesExtras = (p.costItems ?? []).filter((c: any) => c.side === "SALES").reduce((a: number, c: any) => a + Number(c.amount ?? 0), 0);
  const extrasSum = purchaseExtras; // 구매 추가비용 합 (기존 호환)
  const salesRmb = prod ? (prod.salesCurrency === "RMB" ? Number(prod.salesPrice ?? 0) : Number(prod.salesPrice ?? 0) * Number(prod.exchangeRate ?? 0)) : 0;
  const salesConverted = !!prod && (prod.salesCurrency === "RMB" || Number(prod.exchangeRate ?? 0) > 0);
  const salesUnit = salesConverted ? salesRmb : Number(prod?.salesPrice ?? 0);
  const salesVatRate = Number(prod?.salesVatRate ?? 10);
  const salesTotalBase = qty * salesUnit + salesExtras; // 공급가액 = 수량×판매단가 + 판매 추가항목(후가공 등)
  const paymentTotals = {
    salesTotal: salesTotalBase * (1 + salesVatRate / 100),
    salesVatRate,
    salesSupply: salesTotalBase,
    salesCurrency: salesConverted ? "RMB" : (prod?.salesCurrency ?? "RMB"),
    purchaseTotal: productPurchase + purchaseExtras,
    purchaseCurrency: prod?.supplyCurrency ?? "RMB",
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link href="/projects" className="text-sm text-muted-foreground hover:underline">프로젝트</Link>
            <span className="text-muted-foreground">/</span>
            <span className="text-xs text-muted-foreground">현재 단계</span>
            <StepSelect projectId={p.id} current={p.status} size="sm" />
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

          {/* 구매 추가비용 (공장 지급) */}
          <Card>
            <CardHeader><CardTitle className="text-base">구매 추가비용 (공장 지급)</CardTitle></CardHeader>
            <CardContent>
              <PurchaseCostPanel projectId={p.id} items={p.costItems as any} side="PURCHASE"
                currency={prod?.supplyCurrency ?? "RMB"} productAmount={productPurchase} />
            </CardContent>
          </Card>

          {/* 판매 추가항목 (업체 청구) */}
          <Card>
            <CardHeader><CardTitle className="text-base">판매 추가항목 (업체 청구 · 후가공 등)</CardTitle></CardHeader>
            <CardContent>
              <PurchaseCostPanel projectId={p.id} items={p.costItems as any} side="SALES"
                currency={paymentTotals.salesCurrency} productAmount={qty * salesUnit} />
            </CardContent>
          </Card>

          {/* 3. 결재관리 (제품정보와 연계) */}
          <Card>
            <CardHeader><CardTitle className="text-base">결재관리</CardTitle></CardHeader>
            <CardContent>
              <PaymentManager projectId={p.id} productName={p.productName} payments={p.payments as any} totals={paymentTotals} />
            </CardContent>
          </Card>

          {/* 제품제작 후가공내역 및 중요체크사항 */}
          <Card>
            <CardHeader><CardTitle className="text-base">제품제작 후가공내역 및 중요체크사항 (파트너센터)</CardTitle></CardHeader>
            <CardContent>
              <ImportantNotePanel projectId={p.id} value={p.importantNote ?? null} />
            </CardContent>
          </Card>

          {/* 2. 진행 단계 (단계 선택 시 오늘 + 로그인 담당자 자동 기록) */}
          <Card>
            <CardHeader><CardTitle className="text-base">진행 단계</CardTitle></CardHeader>
            <CardContent>
              <StepTimeline projectId={p.id} current={p.status}
                steps={p.steps.map((s) => ({ name: s.name, doneAt: s.doneAt, staff: s.staff, done: s.done }))} />
            </CardContent>
          </Card>

          {/* 진행사진 */}
          <Card>
            <CardHeader><CardTitle className="text-base">진행사진 ({p.progressPhotos.length})</CardTitle></CardHeader>
            <CardContent>
              <ProgressPhotoGrid photos={p.progressPhotos as any} empty="등록된 진행사진이 없습니다. (진행사진 메뉴에서 등록)" />
            </CardContent>
          </Card>

          {/* 3. 업무 (업무요청 통합) */}
          <Card>
            <CardHeader><CardTitle className="text-base">업무</CardTitle></CardHeader>
            <CardContent>
              <WorkRequestPanel
                users={users} clients={clients} factories={factories}
                projects={[{ id: p.id, name: p.productName }]}
                fixedProjectId={p.id} requests={p.workRequests as any} currentUserId={uid} />
            </CardContent>
          </Card>

          {/* 4. 회의록 */}
          <Card>
            <CardHeader><CardTitle className="text-base">회의록</CardTitle></CardHeader>
            <CardContent>
              <MeetingPanel clients={clients} factories={factories} fixedProjectId={p.id} meetings={p.meetings as any} showProject={false} />
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
            <CardHeader><CardTitle className="text-base">주문업체 정보</CardTitle></CardHeader>
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
            <CardHeader><CardTitle className="text-base">구매처 정보</CardTitle></CardHeader>
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

          <Card>
            <CardHeader><CardTitle className="text-base">메모</CardTitle></CardHeader>
            <CardContent>
              <MemoPanel projectId={p.id} memos={p.memos as any} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">고객 요청사항 (파트너센터)</CardTitle></CardHeader>
            <CardContent>
              <PortalRequestPanel projectId={p.id} requests={p.portalRequests as any} canCreate={false} canManage />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">제품제작 문의 및 답변 (파트너센터)</CardTitle></CardHeader>
            <CardContent>
              <InquiryPanel projectId={p.id} clientId={p.clientId ?? undefined} inquiries={p.inquiries as any} role="STAFF" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">영업 (제안서 · 인보이스)</CardTitle></CardHeader>
            <CardContent>
              <ProjectSalesPanel projectId={p.id} productName={p.productName} docs={(p as any).proposals ?? []} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">고객 확인요청 파일 (파트너센터)</CardTitle></CardHeader>
            <CardContent>
              <StaffFilePanel projectId={p.id} files={(p as any).staffFiles ?? []} />
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
