// 직원/포털 프로젝트 상세에 '고객 확인요청 파일' 섹션 삽입. 실행: node scripts/add-staff-files.js
const fs = require("fs");

// ── 1) 직원 프로젝트 상세 ──
(function () {
  const p = "src/app/(dashboard)/projects/[id]/page.tsx";
  if (!fs.existsSync(p)) { console.log("! 직원 프로젝트 상세 파일 없음"); return; }
  let s = fs.readFileSync(p, "utf8");
  let changed = false;

  if (!s.includes("staff-file-panel")) {
    s = s.replace(/(import \{ FilePanel \} from "@\/components\/file-panel";)/, '$1\nimport { StaffFilePanel } from "@/components/staff-file-panel";');
    if (!s.includes("staff-file-panel")) s = 'import { StaffFilePanel } from "@/components/staff-file-panel";\n' + s;
    changed = true;
  }
  // 쿼리에 staffFiles 포함 (include 방식이면 관계 추가)
  if (!s.includes("staffFiles:")) {
    // files include 라인 뒤에 삽입 시도
    const m = s.match(/files:\s*\{[^}]*\},/);
    if (m) {
      s = s.replace(m[0], m[0] + "\n      staffFiles: { orderBy: { createdAt: \"desc\" } },");
      changed = true;
    } else {
      console.log("  (직원) files 쿼리 앵커 못 찾음 — include에 staffFiles 수동 추가 필요");
    }
  }
  // 렌더: 첨부 파일 카드 앞에 삽입
  if (!s.includes("<StaffFilePanel")) {
    const anchor = '<CardTitle className="text-base">첨부 파일</CardTitle>';
    if (s.includes(anchor)) {
      const card = `<Card>
            <CardHeader><CardTitle className="text-base">고객 확인요청 파일</CardTitle></CardHeader>
            <CardContent>
              <StaffFilePanel projectId={p.id} files={(p as any).staffFiles ?? []} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>${anchor}</CardHeader>`;
      s = s.replace('<CardHeader><CardTitle className="text-base">첨부 파일</CardTitle></CardHeader>', card);
      changed = true;
    } else {
      console.log("  (직원) '첨부 파일' 카드 앵커 못 찾음 — 수동 삽입 필요");
    }
  }
  if (changed) { fs.writeFileSync(p, s); console.log("+ 직원 프로젝트 상세 갱신"); }
  else console.log("= 직원 프로젝트 상세 변경 없음");
})();

// ── 2) 포털 프로젝트 상세 ──
(function () {
  const p = "src/app/portal/projects/[id]/page.tsx";
  if (!fs.existsSync(p)) { console.log("! 포털 프로젝트 상세 파일 없음"); return; }
  let s = fs.readFileSync(p, "utf8");
  let changed = false;

  if (!s.includes("portal-file-confirm")) {
    s = s.replace(/(import \{ PortalRequestPanel \} from "@\/components\/portal-request-panel";)/, '$1\nimport { PortalFileConfirm } from "@/components/portal-file-confirm";');
    if (!s.includes("portal-file-confirm")) s = 'import { PortalFileConfirm } from "@/components/portal-file-confirm";\n' + s;
    changed = true;
  }
  if (!s.includes("staffFiles:")) {
    const m = s.match(/portalRequests:\s*\{[^}]*\},/);
    if (m) {
      s = s.replace(m[0], m[0] + "\n      staffFiles: { orderBy: { createdAt: \"desc\" }, select: { id: true, title: true, memo: true, fileName: true, fileSize: true, confirmedAt: true, confirmedBy: true, createdAt: true } },");
      changed = true;
    } else {
      console.log("  (포털) portalRequests 쿼리 앵커 못 찾음 — select에 staffFiles 수동 추가 필요");
    }
  }
  if (!s.includes("<PortalFileConfirm")) {
    // '요청 및 파일 올리기' 카드 앞에 삽입
    const anchor = '<h2 className="mb-3 text-sm font-semibold">제품제작 관련 요청 및 파일 올리기</h2>';
    if (s.includes(anchor)) {
      const block = `<h2 className="mb-3 text-sm font-semibold">고객 확인요청 파일</h2>
          <PortalFileConfirm files={(project as any).staffFiles ?? []} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          ${anchor}`;
      s = s.replace(anchor, block);
      changed = true;
    } else {
      console.log("  (포털) 요청 카드 앵커 못 찾음 — 수동 삽입 필요");
    }
  }
  if (changed) { fs.writeFileSync(p, s); console.log("+ 포털 프로젝트 상세 갱신"); }
  else console.log("= 포털 프로젝트 상세 변경 없음");
})();

console.log("완료");
