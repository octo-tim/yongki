// WorkRequest에 photos(사진 경로 JSON 배열) 필드 추가 + API 저장. 실행: node scripts/patch-work-photos.js
const fs = require("fs");
function edit(path, fn) {
  if (!fs.existsSync(path)) { console.log("! 없음:", path); return; }
  let s = fs.readFileSync(path, "utf8"); const b = s; s = fn(s);
  if (s !== b) { fs.writeFileSync(path, s); console.log("+ 수정:", path); } else console.log("= 변경없음:", path);
}

// 1) 스키마: WorkRequest.photos 추가
edit("prisma/schema.prisma", (s) => {
  if (/model WorkRequest[\s\S]*?photos/.test(s)) return s;
  return s.replace(/(model WorkRequest \{[\s\S]*?\n\s*category\s+String\?[^\n]*\n)/, "$1  photos      String?  // 첨부 사진 경로 JSON 배열\n");
});

// 2) POST API: photos 저장
edit("src/app/api/work-requests/route.ts", (s) => {
  if (s.includes("photos")) return s;
  s = s.replace(
    "const { content, category, requestDate, startDate, endDate, assigneeId, clientId, factoryId, projectId } = await req.json();",
    "const { content, category, requestDate, startDate, endDate, assigneeId, clientId, factoryId, projectId, photos } = await req.json();"
  );
  s = s.replace(
    "      category: category || null,\n      requestDate: new Date(requestDate),",
    "      category: category || null,\n      photos: Array.isArray(photos) && photos.length ? JSON.stringify(photos) : null,\n      requestDate: new Date(requestDate),"
  );
  return s;
});

// 3) PATCH API: photos 수정 허용
edit("src/app/api/work-requests/route.ts", (s) => {
  if (/photos[\s\S]*data\.photos/.test(s)) return s;
  s = s.replace(
    "const { id, done, category, startDate, endDate, content } = await req.json();",
    "const { id, done, category, startDate, endDate, content, photos } = await req.json();"
  );
  // done 처리 블록 뒤에 photos 반영 추가
  s = s.replace(
    "  const data: any = {};\n",
    "  const data: any = {};\n  if (Array.isArray(photos)) data.photos = photos.length ? JSON.stringify(photos) : null;\n"
  );
  return s;
});

console.log("완료");
