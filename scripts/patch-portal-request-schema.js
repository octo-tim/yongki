// ClientPortalRequest에 파일 확인 필드 추가. 실행: node scripts/patch-portal-request-schema.js
const fs = require("fs");
const p = "prisma/schema.prisma";
let s = fs.readFileSync(p, "utf8");

const start = s.indexOf("model ClientPortalRequest {");
if (start === -1) { console.error("! ClientPortalRequest 모델을 찾지 못했습니다"); process.exit(1); }
const end = s.indexOf("\n}", start);
let block = s.slice(start, end);

const adds = [
  ["fileCheckedAt", "  fileCheckedAt DateTime? // 파일 확인 시각"],
  ["fileCheckedBy", "  fileCheckedBy String? // 파일 확인자"],
];
const missing = adds.filter(([k]) => !block.includes(k)).map(([, l]) => l);
if (missing.length === 0) { console.log("이미 적용되어 있습니다."); process.exit(0); }

const m = block.match(/\n\s*status\s+String[^\n]*/);
if (!m) { console.error("! status 필드를 찾지 못했습니다"); process.exit(1); }
const idx = block.indexOf(m[0]) + m[0].length;
block = block.slice(0, idx) + "\n" + missing.join("\n") + block.slice(idx);
s = s.slice(0, start) + block + s.slice(end);
fs.writeFileSync(p, s);
console.log("완료: ClientPortalRequest에 필드 추가 →", missing.length, "개");
