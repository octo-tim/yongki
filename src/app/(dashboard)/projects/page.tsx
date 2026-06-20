import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Prisma, type ProjectStatus } from "@prisma/client";
import { ALL_STATUSES } from "@/lib/status";
import { getStatusConfig } from "@/lib/status-config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import { fmtDate, fmtMoney } from "@/lib/utils";
import { Download, PlusCircle, Search } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: { status?: string; q?: string };
}) {
  const statusCfg = await getStatusConfig();

  const status = searchParams.status as ProjectStatus | undefined;
  const q = searchParams.q?.trim();

  const where: Prisma.ProjectWhereInput = {};
  if (status && ALL_STATUSES.includes(status)) where.status = status;
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
    include: { client: true, factory: true, manager: true },
  });

  const exportQs = new URLSearchParams();
  if (status) exportQs.set("status", status);
  if (q) exportQs.set("q", q);

  return (
    <div className="space-y-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">프로젝트 목록</h1>
          <p className="text-sm text-muted-foreground">총 {projects.length}건</p>
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
        {status && <input type="hidden" name="status" value={status} />}
        <Button type="submit" variant="secondary">검색</Button>
      </form>

      <div className="flex flex-wrap gap-2">
        <Link href="/projects">
          <span className={`rounded-full border px-3 py-1 text-xs ${!status ? "bg-primary text-primary-foreground" : "bg-background"}`}>전체</span>
        </Link>
        {statusCfg.order.map((s) => (
          <Link key={s} href={`/projects?status=${s}${q ? `&q=${q}` : ""}`}>
            <span className={`rounded-full border px-3 py-1 text-xs ${status === s ? "bg-primary text-primary-foreground" : "bg-background"}`}>
              {statusCfg.label[s]}
            </span>
          </Link>
        ))}
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-14 px-2"></TableHead>
              <TableHead>상태</TableHead>
              <TableHead>주문일</TableHead>
              <TableHead>상품명</TableHead>
              <TableHead>업체</TableHead>
              <TableHead>공장</TableHead>
              <TableHead className="text-right">수량</TableHead>
              <TableHead>완성예정</TableHead>
              <TableHead>책임자</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects.length === 0 && (
              <TableRow><TableCell colSpan={9} className="py-10 text-center text-muted-foreground">프로젝트가 없습니다.</TableCell></TableRow>
            )}
            {projects.map((p) => (
              <TableRow key={p.id} className="cursor-pointer">
                <TableCell className="px-2">
                  {p.productPhoto ? (
                    <img src={p.productPhoto} alt="" className="h-10 w-10 rounded-md border object-cover" />
                  ) : (
                    <div className="h-10 w-10 rounded-md border border-dashed bg-muted/30" />
                  )}
                </TableCell>
                <TableCell><StatusBadge status={p.status} label={statusCfg.label[p.status]} colorClass={statusCfg.style[p.status]} /></TableCell>
                <TableCell className="whitespace-nowrap">{fmtDate(p.orderDate)}</TableCell>
                <TableCell className="max-w-xs">
                  <Link href={`/projects/${p.id}`} className="font-medium hover:underline">{p.productName}</Link>
                </TableCell>
                <TableCell>{p.client?.name ?? "-"}</TableCell>
                <TableCell className="max-w-[14rem] truncate text-xs text-muted-foreground">{p.factory?.name ?? "-"}</TableCell>
                <TableCell className="text-right">{fmtMoney(p.quantity)}</TableCell>
                <TableCell className="whitespace-nowrap">{fmtDate(p.expectedCompletionDate)}</TableCell>
                <TableCell>{p.manager?.name ?? "-"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
