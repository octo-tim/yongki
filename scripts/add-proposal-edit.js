// proposal-manager 행에 제안서 수정 버튼 삽입. 실행: node scripts/add-proposal-edit.js
const fs = require("fs");
const p = "src/components/proposal-manager.tsx";
let s = fs.readFileSync(p, "utf8");
let log = [];

// 1) import 추가
if (!s.includes("proposal-edit-dialog")) {
  s = s.replace(
    /(import \{ cn, fmtUnit \} from "@\/lib\/utils";)/,
    '$1\nimport { ProposalEditDialog } from "@/components/proposal-edit-dialog";'
  );
  log.push("import 추가");
}

// 2) type Proposal에 revisionNo/vatApplied/items 필드 보강 (없으면)
if (!/revisionNo\?/.test(s)) {
  s = s.replace(
    /(sourceId\?: string \| null;)/,
    "$1 revisionNo?: number | null; vatApplied?: boolean | null; items?: any; depositPct?: number | null;"
  );
  log.push("Proposal 타입 필드 보강");
}

// 3) 제안서 행에 수정 버튼 삽입 (프린트 링크 앞, PROPOSAL만)
if (!s.includes("<ProposalEditDialog")) {
  const anchor = '<Link href={`/quote/${p.id}`} className="shrink-0 rounded p-1 text-muted-foreground hover:bg-accent" title="문서 보기/인쇄/메일"><Printer className="h-3.5 w-3.5" /></Link>';
  if (s.includes(anchor)) {
    s = s.replace(anchor, '{(p.docType ?? "PROPOSAL") === "PROPOSAL" && <ProposalEditDialog proposal={p as any} />}\n            ' + anchor);
    log.push("수정 버튼 삽입");
  } else {
    log.push("! 프린트 링크 앵커를 찾지 못했습니다 — 수동 삽입 필요");
  }
}

fs.writeFileSync(p, s);
console.log(log.length ? "완료:\n - " + log.join("\n - ") : "변경 없음(이미 적용)");
