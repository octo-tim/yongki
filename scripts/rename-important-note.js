// "제품제작 중요사항" → "제품제작 후가공내역 및 중요체크사항" 라벨 일괄 변경.
// 실행: node scripts/rename-important-note.js
const fs = require("fs");
const path = require("path");

const NEW = "제품제작 후가공내역 및 중요체크사항";
const REPLACEMENTS = [
  ["제품제작 중요사항", NEW],
  ["제품제작중요사항", NEW], // 붙여쓴 표기 (엑셀 내보내기 헤더 등)
  ["제품 제작 시 중요사항을 입력하세요", "후가공 내역 및 중요 체크사항을 입력하세요"], // 입력 placeholder
];

let files = 0, hits = 0;
function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) { if (name !== "node_modules" && name !== ".next" && name !== ".git") walk(p); continue; }
    if (!/\.(tsx?|jsx?)$/.test(name)) continue;
    let src = fs.readFileSync(p, "utf8");
    let changed = false;
    for (const [from, to] of REPLACEMENTS) {
      if (src.includes(from)) {
        const n = src.split(from).length - 1;
        src = src.split(from).join(to);
        hits += n; changed = true;
        console.log(`  ${p}  ("${from}" x${n})`);
      }
    }
    if (changed) { fs.writeFileSync(p, src); files++; }
  }
}
walk("src");
console.log(files ? `완료: ${files}개 파일 · ${hits}곳 변경` : "변경할 라벨을 찾지 못했습니다 (이미 적용됐거나 표기가 다름)");
