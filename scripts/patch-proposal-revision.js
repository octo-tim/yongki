// 제안서 버전(수정 이력) 스키마 추가. 실행: node scripts/patch-proposal-revision.js
const fs = require("fs");
const p = "prisma/schema.prisma";
let s = fs.readFileSync(p, "utf8");
let log = [];

// 1) Proposal 모델에 revisionNo 필드 추가
const start = s.indexOf("model Proposal {");
if (start === -1) { console.error("! Proposal 모델을 찾지 못했습니다"); process.exit(1); }
const end = s.indexOf("\n}", start);
let block = s.slice(start, end);
if (!block.includes("revisionNo")) {
  const m = block.match(/\n\s*status\s+String[^\n]*/);
  const idx = block.indexOf(m[0]) + m[0].length;
  block = block.slice(0, idx) + "\n  revisionNo  Int       @default(1) // 현재 버전 번호" + block.slice(idx);
  if (!/revisions\s+ProposalRevision/.test(block)) {
    // 관계 필드도 추가 (닫는 괄호 직전)
    block = block.replace(/\n\}\s*$/, "");
    block += "\n  revisions   ProposalRevision[]\n";
  }
  s = s.slice(0, start) + block + s.slice(end);
  log.push("Proposal.revisionNo + revisions[] 추가");
} else {
  log.push("Proposal 필드 이미 존재");
}

// 2) ProposalRevision 모델 추가
if (!s.includes("model ProposalRevision")) {
  s += `

model ProposalRevision {
  id          String   @id @default(cuid())
  proposalId  String
  proposal    Proposal @relation(fields: [proposalId], references: [id], onDelete: Cascade)
  revisionNo  Int
  title       String
  productName String?
  amount      Decimal? @db.Decimal(16, 4)
  currency    String?
  depositPct  Int?
  vatApplied  Boolean  @default(true)
  items       Json?
  note        String?
  editedById  String?
  editedByName String?
  invoiceId   String? // 이 버전에서 발행된 인보이스 id
  createdAt   DateTime @default(now())

  @@index([proposalId])
  @@map("proposal_revisions")
}
`;
  log.push("ProposalRevision 모델 추가");
} else {
  log.push("ProposalRevision 이미 존재");
}

fs.writeFileSync(p, s);
console.log("완료:\n - " + log.join("\n - "));
