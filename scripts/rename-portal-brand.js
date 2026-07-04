// "고객 공유 페이지" → "코스메팩 파트너센터" 일괄 변경. 실행: node scripts/rename-portal-brand.js
const fs = require("fs");
const path = require("path");

const REPLACEMENTS = [
  ["고객 공유 페이지", "코스메팩 파트너센터"],
  ["고객 공유페이지", "코스메팩 파트너센터"],
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
        console.log(`  ${p}  x${n}`);
      }
    }
    if (changed) { fs.writeFileSync(p, src); files++; }
  }
}
walk("src");
console.log(files ? `완료: ${files}개 파일 · ${hits}곳 변경` : "변경할 문구를 찾지 못했습니다");
