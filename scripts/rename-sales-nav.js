// 사이드바 "제안서발송" → "영업관리" 변경. 실행: node scripts/rename-sales-nav.js
const fs = require("fs");
const p = "src/lib/i18n.ts";
let s = fs.readFileSync(p, "utf8");
let n = 0;
if (s.includes('"nav.proposals": "제안서발송"')) { s = s.replace('"nav.proposals": "제안서발송"', '"nav.proposals": "영업관리"'); n++; }
if (s.includes('"nav.proposals": "提案书发送"')) { s = s.replace('"nav.proposals": "提案书发送"', '"nav.proposals": "销售管理"'); n++; }
if (n) { fs.writeFileSync(p, s); console.log(`완료: i18n 라벨 ${n}곳 변경 (한/중)`); }
else console.log("이미 적용됐거나 라벨을 찾지 못했습니다 — src/lib/i18n.ts에서 nav.proposals 값을 확인하세요");
