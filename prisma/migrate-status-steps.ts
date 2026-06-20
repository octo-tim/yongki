/**
 * 4상태(준비·진행중·출고대기·완료) / 13단계 구조로 마이그레이션.
 *  - StepTemplate / StatusSetting 을 새 구조로 재설정
 *  - 완료(DONE/완료) 프로젝트: 단계는 그대로 두고 status 만 "완료"로 정리 (제외 대상)
 *  - 그 외 프로젝트: 13단계로 재구성(기존 done/doneAt/staff 는 단계명으로 보존,
 *    신규 '고객의뢰'는 기존 진행이력/주문일이 있으면 완료 처리) 후 단계로부터 상태 자동 도출
 * 실행:  DATABASE_URL="<공개DB_URL>" npx tsx prisma/migrate-status-steps.ts
 */
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

type Def = { type: "PRODUCTION" | "SHIPPING"; status: string; group: string; name: string; order: number };
const CANON: Def[] = [
  { type: "PRODUCTION", status: "준비",   group: "준비",   name: "고객의뢰",         order: 0 },
  { type: "PRODUCTION", status: "준비",   group: "준비",   name: "공장주문",         order: 1 },
  { type: "PRODUCTION", status: "준비",   group: "준비",   name: "계약금입금(공장)",  order: 2 },
  { type: "PRODUCTION", status: "진행중", group: "진행중", name: "파일수령(업체)",    order: 3 },
  { type: "PRODUCTION", status: "진행중", group: "진행중", name: "파일전달(공장)",    order: 4 },
  { type: "PRODUCTION", status: "진행중", group: "진행중", name: "중간검품",         order: 5 },
  { type: "PRODUCTION", status: "진행중", group: "진행중", name: "생산완료",         order: 6 },
  { type: "SHIPPING",   status: "출고대기", group: "출고대기", name: "창고입고",      order: 0 },
  { type: "SHIPPING",   status: "출고대기", group: "출고대기", name: "검품",         order: 1 },
  { type: "SHIPPING",   status: "출고대기", group: "출고대기", name: "출고",         order: 2 },
  { type: "SHIPPING",   status: "출고대기", group: "출고대기", name: "한국도착",      order: 3 },
  { type: "SHIPPING",   status: "완료",     group: "완료",     name: "고객인도",     order: 4 },
];
const STEP_ORDER = CANON.map((s) => s.name);
const STEP_STATUS: Record<string, string> = Object.fromEntries(CANON.map((s) => [s.name, s.status]));

function statusFromSteps(steps: { name: string; done: boolean }[]): string {
  const done = new Set(steps.filter((s) => s.done).map((s) => s.name));
  if (done.has("고객인도")) return "완료";
  for (const name of STEP_ORDER) {
    if (name === "고객인도") break;
    if (!done.has(name)) return STEP_STATUS[name];
  }
  return "출고대기";
}

const DONE_VALUES = new Set(["DONE", "완료"]);
const STATUS_COLOR: Record<string, string> = { 준비: "slate", 진행중: "blue", 출고대기: "amber", 완료: "emerald" };

async function main() {
  // 1) StepTemplate 재설정
  await prisma.stepTemplate.deleteMany({});
  await prisma.stepTemplate.createMany({ data: CANON.map((s) => ({ type: s.type, group: s.group, name: s.name, order: s.order })) });
  console.log(`StepTemplate 재설정: ${CANON.length}개`);

  // 2) StatusSetting 재설정 (4종)
  await prisma.statusSetting.deleteMany({});
  await prisma.statusSetting.createMany({
    data: ["준비", "진행중", "출고대기", "완료"].map((k, i) => ({ key: k, label: k, color: STATUS_COLOR[k], sortOrder: i })),
  });
  console.log("StatusSetting 재설정: 4종 (준비/진행중/출고대기/완료)");

  // 3) 프로젝트별 처리
  const projects = await prisma.project.findMany({
    select: { id: true, status: true, orderDate: true, steps: { select: { id: true, name: true, done: true, doneAt: true, staff: true } } },
  });

  let doneSkipped = 0, rebuilt = 0;
  for (const p of projects) {
    // 완료 프로젝트: 단계 보존, status 만 "완료"로 정리
    if (DONE_VALUES.has(p.status) || p.steps.some((s) => s.name === "고객인도" && s.done)) {
      if (p.status !== "완료") await prisma.project.update({ where: { id: p.id }, data: { status: "완료", manualStatus: null, manualHold: false } });
      doneSkipped++;
      continue;
    }

    // 기존 단계 done 보존 맵
    const old = new Map(p.steps.map((s) => [s.name, s] as const));
    const anyDone = p.steps.some((s) => s.done);
    const hasOrder = !!p.orderDate;

    // 13단계 재구성
    await prisma.projectStep.deleteMany({ where: { projectId: p.id } });
    const newSteps = CANON.map((c) => {
      const o: any = old.get(c.name);
      let done = o?.done ?? false;
      let doneAt = o?.doneAt ?? null;
      let staff = o?.staff ?? null;
      // 신규 '고객의뢰': 기존 진행이력 또는 주문일이 있으면 완료 처리
      if (c.name === "고객의뢰" && !o) {
        if (anyDone || hasOrder) { done = true; doneAt = p.orderDate ?? null; }
      }
      return { projectId: p.id, type: c.type, group: c.group, name: c.name, order: c.order, done, doneAt, staff };
    });
    await prisma.projectStep.createMany({ data: newSteps });

    const status = statusFromSteps(newSteps.map((s) => ({ name: s.name, done: s.done })));
    await prisma.project.update({ where: { id: p.id }, data: { status, manualStatus: null, manualHold: false } });
    rebuilt++;
  }

  console.log(`완료(제외): ${doneSkipped}건  ·  재구성: ${rebuilt}건  ·  총 ${projects.length}건`);

  // 분포 출력
  const dist = await prisma.project.groupBy({ by: ["status"], _count: { _all: true } });
  console.log("상태 분포:", dist.map((d) => `${d.status}=${d._count._all}`).join(", "));
}

main().then(() => prisma.$disconnect()).catch((e) => { console.error(e); prisma.$disconnect(); process.exit(1); });
