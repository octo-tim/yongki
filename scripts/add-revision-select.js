// 영업관리 페이지 쿼리에 버전/항목 필드 추가. 실행: node scripts/add-revision-select.js
const fs = require("fs");
const p = "src/app/(dashboard)/proposals/page.tsx";
let s = fs.readFileSync(p, "utf8");

if (s.includes("revisionNo: true")) { console.log("이미 적용되어 있습니다."); process.exit(0); }

const m = s.match(/docType: true, depositPct: true, sentTo: true, sentAt: true, sourceId: true,/);
if (!m) { console.error("! select 앵커를 찾지 못했습니다. 수동으로 revisionNo/vatApplied/items 를 select에 추가하세요."); process.exit(1); }
s = s.replace(m[0], m[0] + " revisionNo: true, vatApplied: true, items: true,");
fs.writeFileSync(p, s);
console.log("완료: revisionNo/vatApplied/items select 추가");
