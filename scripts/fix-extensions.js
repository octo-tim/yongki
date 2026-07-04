// src 내 확장자가 사라진 파일(.tsx/.ts) 자동 복구. 실행: node scripts/fix-extensions.js
const fs = require("fs");
const path = require("path");

let fixed = 0;
function extFor(p) {
  // API 라우트·lib·scripts는 .ts, 그 외(페이지·컴포넌트)는 .tsx
  if (p.includes(`${path.sep}api${path.sep}`) || p.startsWith(`src${path.sep}lib${path.sep}`)) return ".ts";
  return ".tsx";
}
function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) { walk(p); continue; }
    if (name.includes(".")) continue; // 확장자 있음
    if (name === "Icon" || name.startsWith("Icon")) { fs.unlinkSync(p); console.log("삭제(Finder 찌꺼기):", p); continue; }
    if (st.size === 0) { fs.unlinkSync(p); console.log("삭제(빈 파일):", p); continue; }
    const to = p + extFor(p);
    if (fs.existsSync(to)) {
      // 동일 이름의 정상 파일이 이미 있으면 그림자 파일 삭제
      fs.unlinkSync(p);
      console.log("삭제(그림자 중복):", p);
    } else {
      fs.renameSync(p, to);
      console.log("복구:", p, "→", path.basename(to));
    }
    fixed++;
  }
}
walk("src");
console.log(fixed ? `완료: ${fixed}건 처리` : "확장자 소실 파일 없음 ✓");
