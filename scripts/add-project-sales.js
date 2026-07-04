// 직원 프로젝트 상세에 '영업(제안서/인보이스)' 섹션 삽입. 실행: node scripts/add-project-sales.js
const fs = require("fs");
const p = "src/app/(dashboard)/projects/[id]/page.tsx";
if (!fs.existsSync(p)) { console.error("! 프로젝트 상세 파일 없음"); process.exit(1); }
let s = fs.readFileSync(p, "utf8");
let log = [];

// import
if (!s.includes("project-sales-panel")) {
  s = 'import { ProjectSalesPanel } from "@/components/project-sales-panel";\n' + s;
  log.push("import 추가");
}

// 쿼리: proposals include (include 방식 가정)
if (!s.includes("proposals:")) {
  const m = s.match(/files:\s*\{[^}]*\},/);
  if (m) {
    s = s.replace(m[0], m[0] + '\n      proposals: { orderBy: { createdAt: "desc" }, select: { id: true, title: true, docType: true, invoiceKind: true, amount: true, currency: true, status: true, sentDate: true, sentTo: true } },');
    log.push("proposals 쿼리 추가");
  } else log.push("! files 쿼리 앵커 못 찾음 — include에 proposals 수동 추가 필요");
}

// 렌더: '고객 확인요청 파일' 또는 '첨부 파일' 카드 앞에 삽입
if (!s.includes("<ProjectSalesPanel")) {
  let anchor = '<CardTitle className="text-base">고객 확인요청 파일</CardTitle>';
  if (!s.includes(anchor)) anchor = '<CardTitle className="text-base">첨부 파일</CardTitle>';
  if (s.includes(anchor)) {
    const card = `<Card>
            <CardHeader><CardTitle className="text-base">영업 (제안서 · 인보이스)</CardTitle></CardHeader>
            <CardContent>
              <ProjectSalesPanel projectId={p.id} productName={p.productName} docs={(p as any).proposals ?? []} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>${anchor}</CardHeader>`;
    s = s.replace('<CardHeader>' + anchor + '</CardHeader>', card);
    log.push("영업 섹션 삽입");
  } else log.push("! 카드 앵커 못 찾음 — 수동 삽입 필요");
}

fs.writeFileSync(p, s);
console.log("완료:\n - " + log.join("\n - "));
