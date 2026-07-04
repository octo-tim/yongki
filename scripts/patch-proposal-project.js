// Proposal에 projectId, invoiceKind 추가 + Project 관계. 실행: node scripts/patch-proposal-project.js
const fs = require("fs");
const p = "prisma/schema.prisma";
let s = fs.readFileSync(p, "utf8");
let log = [];

// 1) Proposal 필드
const start = s.indexOf("model Proposal {");
if (start === -1) { console.error("! Proposal 모델 없음"); process.exit(1); }
const end = s.indexOf("\n}", start);
let block = s.slice(start, end);
const adds = [
  ["projectId", "  projectId   String? // 연결된 프로젝트"],
  ["invoiceKind", '  invoiceKind String? // DEPOSIT(계약금) | BALANCE(잔금) | FULL(전체)'],
];
const missing = adds.filter(([k]) => !new RegExp("\\b" + k + "\\b").test(block)).map(([, l]) => l);
if (missing.length) {
  const m = block.match(/\n\s*sourceId\s+String\?[^\n]*/) || block.match(/\n\s*docType\s+String[^\n]*/);
  const idx = block.indexOf(m[0]) + m[0].length;
  block = block.slice(0, idx) + "\n" + missing.join("\n") + block.slice(idx);
  // 관계 필드
  if (!/project\s+Project\?/.test(block)) {
    block = block.replace(/(\n\s*creator\s+User\?[^\n]*)/, '$1\n  project     Project?  @relation("ProjectInvoices", fields: [projectId], references: [id], onDelete: SetNull)');
  }
  s = s.slice(0, start) + block + s.slice(end);
  log.push("Proposal: projectId/invoiceKind + project 관계 추가");
} else log.push("Proposal 필드 이미 존재");

// 2) Project 역관계
const ps = s.indexOf("model Project {");
const pe = s.indexOf("\n}", ps);
let pblock = s.slice(ps, pe);
if (!/proposals\s+Proposal\[\]/.test(pblock)) {
  const m = pblock.match(/\n\s*inquiries\s+ClientInquiry\[\]/) || pblock.match(/\n\s*costItems\s+CostItem\[\]/);
  if (m) {
    const idx = pblock.indexOf(m[0]) + m[0].length;
    pblock = pblock.slice(0, idx) + '\n  proposals      Proposal[] @relation("ProjectInvoices")' + pblock.slice(idx);
    s = s.slice(0, ps) + pblock + s.slice(pe);
    log.push("Project.proposals[] 역관계 추가");
  } else log.push("! Project 관계 앵커 못 찾음 — 수동 추가 필요");
}

fs.writeFileSync(p, s);
console.log("완료:\n - " + log.join("\n - "));
