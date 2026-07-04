// 제안서/인보이스 모두 수정 버튼 노출 + clients 전달. 실행: node scripts/enable-invoice-edit.js
const fs = require("fs");
const p = "src/components/proposal-manager.tsx";
let s = fs.readFileSync(p, "utf8");
let log = [];

// 1) import 보장
if (!s.includes("proposal-edit-dialog")) {
  s = s.replace(/(import \{ cn, fmtUnit \} from "@\/lib\/utils";)/, '$1\nimport { ProposalEditDialog } from "@/components/proposal-edit-dialog";');
  log.push("import 추가");
}

// 2) 기존 "PROPOSAL만 수정" 조건이 있으면 제거하여 항상 노출 + clients 전달
//    형태 A: {(p.docType ?? "PROPOSAL") === "PROPOSAL" && <ProposalEditDialog proposal={p as any} />}
const reA = /\{\(p\.docType \?\? "PROPOSAL"\) === "PROPOSAL" && <ProposalEditDialog proposal=\{p as any\} \/>\}/;
if (reA.test(s)) {
  s = s.replace(reA, '<ProposalEditDialog proposal={p as any} clients={clients} />');
  log.push("수정 버튼: 전체 문서 노출 + clients 전달");
} else if (s.includes("<ProposalEditDialog proposal={p as any} />")) {
  s = s.replace("<ProposalEditDialog proposal={p as any} />", "<ProposalEditDialog proposal={p as any} clients={clients} />");
  log.push("clients 전달 추가");
} else if (!s.includes("<ProposalEditDialog")) {
  // 버튼 자체가 없으면 프린트 링크 앞에 삽입 (전체 문서 대상)
  const anchor = '<Link href={`/quote/${p.id}`} className="shrink-0 rounded p-1 text-muted-foreground hover:bg-accent" title="문서 보기/인쇄/메일"><Printer className="h-3.5 w-3.5" /></Link>';
  if (s.includes(anchor)) {
    s = s.replace(anchor, '<ProposalEditDialog proposal={p as any} clients={clients} />\n            ' + anchor);
    log.push("수정 버튼 신규 삽입(전체 문서)");
  } else log.push("! 프린트 링크 앵커 없음 — 수동 삽입 필요");
}

fs.writeFileSync(p, s);
console.log(log.length ? "완료:\n - " + log.join("\n - ") : "변경 없음");
