// 대시보드에 회신요청 목록 삽입. 실행: node scripts/add-reply-requests.js
const fs = require("fs");
const path = "src/app/(dashboard)/dashboard/page.tsx";

let src = fs.readFileSync(path, "utf8");
let changed = false;

if (!src.includes('from "@/components/reply-requests"')) {
  src = 'import { ReplyRequests } from "@/components/reply-requests";\n' + src;
  changed = true;
  console.log("+ import 추가");
}

if (!src.includes("<ReplyRequests />")) {
  const anchor = "{/* 단계별 프로젝트";
  const i = src.indexOf(anchor);
  if (i === -1) {
    console.error("! 삽입 위치(단계별 프로젝트 주석)를 찾지 못했습니다.");
    console.error("  수동 삽입: 대시보드 원하는 위치에  <ReplyRequests />  한 줄을 추가하세요.");
  } else {
    const ls = src.lastIndexOf("\n", i) + 1;
    src = src.slice(0, ls) + "      <ReplyRequests />\n\n" + src.slice(ls);
    changed = true;
    console.log("+ <ReplyRequests /> 삽입 (단계별 프로젝트 섹션 위)");
  }
}

if (changed) {
  fs.writeFileSync(path, src);
  console.log("완료: " + path);
} else {
  console.log("이미 적용되어 있습니다.");
}
