import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getStatusConfig } from "@/lib/status-config";
import { furthestStep, statusOfStep, STEP_BUCKETS } from "@/lib/steps";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fmtDate, fmtMoney, cn } from "@/lib/utils";
import { Download, PlusCircle, Search } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ProjectsPage({ searchParams }: { searchParams: { q?: string } }) {
  const statusCfg = await getStatusConfig();
  const q = searchParams.q?.trim();

  const where: Prisma.ProjectWhereInput = {};
  if (q) {
    where.OR = [
      { productName: { contains: q, mode: "insensitive" } },
      { orderNo: { contains: q, mode: "insensitive" } },
      { client: { name: { contains: q, mode: "insensitive" } } },
      { factory: { name: { contains: q, mode: "insensitive" } } },
    ];
  }

  const projects = await prisma.project.findMany({
    where, orderBy: { orderDate: "desc" },
    include: { client: true, factory: true, manager: true, steps: { select: { name: true, done: true } } },
  });

  // 단계별(가장 멀리 완료된 단계)로 그룹
  const groups = new Map<string, typeof projects>();
  for (const p of projects) {
    const key = furthestStep(p.steps) ?? "시작전";
    const arr = groups.get(key);
    if (arr) arr.push(p); else groups.set(key, [p]);
  }
  const buckets = STEP_BUCKETS.filter((b) => (groups.get(b)?.length ?? 0) > 0);

  const exportQs = new URLSearchParams();
  if (q) exportQs.set("q", q);

  return (
    <div className="space-y-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">프로젝트 목록</h1>
          <p className="text-sm text-muted-foreground">단계별 · 총 {projects.length}건</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <a href={`/api/export?${exportQs.toString()}`}><Download className="h-4 w-4" /> 엑셀 다운로드</a>
          </Button>
          <Button asChild><Link href="/projects/new"><PlusCircle className="h-4 w-4" /> 등록</Link></Button>
        </div>
      </div>

      <form className="flex flex-wrap items-center gap-2" action="/projects" method="get">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input name="q" defaultValue={q} placeholder="상품명·주문번호·업체·공장" className="w-72 pl-8" />
        </div>
        <Button type="submit" variant="secondary">검색</Button>
        {q && <Button asChild variant="ghost"><Link href="/projects">초기화</Link></Button>}
      </form>

      {/* 단계 바로가기 */}
      <div className="flex flex-wrap gap-1.5">
        {buckets.map((b) => (
          <a key={b} href={`#step-${encodeURIComponent(b)}`}
            className={cn("rounded-full border px-2.5 py-1 text-xs", statusCfg.style[statusOfStep(b)] ?? "")}>
            {b} <span className="opacity-70">{groups.get(b)!.length}</span>
          </a>
        ))}
      </div>

      {projects.length === 0 && (
        <Card><div className="py-12 text-center text-muted-foreground">프로젝트가 없습니다.</div></Card>
      )}

      {buckets.map((b) => {
        const rows = groups.get(b)!;
        const st = statusOfStep(b);
        return (
          <section key={b} id={`step-${encodeURIComponent(b)}`} className="space-y-2 scroll-mt-4">
            <div className="flex items-center gap-2">
              <span className={cn("rounded-full border px-2.5 py-0.5 text-xs font-semibold", statusCfg.style[st] ?? "")}>{statusCfg.label[st] ?? st}</span>
              <h2 className="text-sm font-bold">{b}</h2>
              <span className="text-xs text-muted-foreground">{rows.length}건</span>
            </div>
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>주문번호</TableHead>
                    <TableHead className="w-16 px-2">제품사진</TableHead>
                    <TableHead>제품명</TableHead>
                    <TableHead className="text-right">수량</TableHead>
                    <TableHead>업체</TableHead>
                    <TableHead>제작공장</TableHead>
                    <TableHead>완성예정일</TableHead>
                    <TableHead>담당자</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((p) => (
                    <TableRow key={p.id} className="cursor-pointer">
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{p.orderNo ?? "-"}</TableCell>
                      <TableCell className="px-2">
                        {p.productPhoto ? (
                          <img src={p.productPhoto} alt="" className="h-10 w-10 rounded-md border object-cover" />
                        ) : (
                          <div className="h-10 w-10 rounded-md border border-dashed bg-muted/30" />
                        )}
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <Link href={`/projects/${p.id}`} className="font-medium hover:underline">{p.productName}</Link>
                      </TableCell>
                      <TableCell className="text-right">{fmtMoney(p.quantity)}</TableCell>
                      <TableCell>{p.client?.name ?? "-"}</TableCell>
                      <TableCell className="max-w-[14rem] truncate text-xs text-muted-foreground">{p.factory?.name ?? "-"}</TableCell>
                      <TableCell className="whitespace-nowrap">{fmtDate(p.expectedCompletionDate)}</TableCell>
                      <TableCell>{p.manager?.name ?? "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </section>
        );
      })}
    </div>
  );
}
