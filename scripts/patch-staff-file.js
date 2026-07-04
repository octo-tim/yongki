// 고객 확인요청 파일(직원→고객) 모델 추가. 실행: node scripts/patch-staff-file.js
const fs = require("fs");
const p = "prisma/schema.prisma";
let s = fs.readFileSync(p, "utf8");
let log = [];

if (!s.includes("model StaffFileRequest")) {
  s += `

model StaffFileRequest {
  id            String    @id @default(cuid())
  projectId     String
  project       Project   @relation(fields: [projectId], references: [id], onDelete: Cascade)
  clientId      String?
  title         String
  memo          String?
  fileName      String
  fileType      String?
  fileSize      Int?
  data          Bytes
  uploaderId    String?
  uploaderName  String?
  confirmedAt   DateTime? // 고객 확인 시각
  confirmedBy   String? // 확인한 고객 계정명
  createdAt     DateTime  @default(now())

  @@index([projectId])
  @@index([clientId])
  @@map("staff_file_requests")
}
`;
  log.push("StaffFileRequest 모델 추가");
}

// Project 관계 필드
const start = s.indexOf("model Project {");
const end = s.indexOf("\n}", start);
let block = s.slice(start, end);
if (!/staffFiles\s+StaffFileRequest/.test(block)) {
  const m = block.match(/\n\s*inquiries\s+ClientInquiry\[\]/) || block.match(/\n\s*portalRequests\s+ClientPortalRequest\[\]/);
  if (m) {
    const idx = block.indexOf(m[0]) + m[0].length;
    block = block.slice(0, idx) + "\n  staffFiles     StaffFileRequest[]" + block.slice(idx);
    s = s.slice(0, start) + block + s.slice(end);
    log.push("Project.staffFiles[] 관계 추가");
  } else {
    log.push("! Project 관계 앵커 못 찾음 — 수동으로 staffFiles StaffFileRequest[] 추가 필요");
  }
}

fs.writeFileSync(p, s);
console.log(log.length ? "완료:\n - " + log.join("\n - ") : "이미 적용되어 있습니다.");
