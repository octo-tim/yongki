// Proposal 모델에 영업관리 필드 추가. 실행: node scripts/patch-proposal-schema.js
const fs = require("fs");
const p = "prisma/schema.prisma";
let s = fs.readFileSync(p, "utf8");

const start = s.indexOf("model Proposal {");
if (start === -1) { console.error("! Proposal 모델을 찾지 못했습니다"); process.exit(1); }
const end = s.indexOf("\n}", start);
let block = s.slice(start, end);

const adds = [
  ["docType", '  docType     String    @default("PROPOSAL") // PROPOSAL(제안서) | INVOICE(인보이스)'],
  ["depositPct", "  depositPct  Int       @default(30) // 계약금 비율 퍼센트"],
  ["sentTo", "  sentTo      String? // 최근 메일 발송 주소"],
  ["sentAt", "  sentAt      DateTime? // 최근 메일 발송 시각"],
];
const missing = adds.filter(([k]) => !new RegExp(`\\b${k}\\b`).test(block)).map(([, l]) => l);
if (missing.length === 0) { console.log("이미 적용되어 있습니다."); process.exit(0); }

const m = block.match(/\n\s*status\s+String[^\n]*/);
if (!m) { console.error("! status 필드를 찾지 못했습니다"); process.exit(1); }
const idx = block.indexOf(m[0]) + m[0].length;
block = block.slice(0, idx) + "\n" + missing.join("\n") + block.slice(idx);
s = s.slice(0, start) + block + s.slice(end);
fs.writeFileSync(p, s);
console.log("완료: Proposal에 필드 추가 →", missing.length, "개");
