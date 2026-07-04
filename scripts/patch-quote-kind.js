// quote 문서에서 계약금/잔금 인보이스는 분할행 대신 해당 금액만 표시. 실행: node scripts/patch-quote-kind.js
const fs = require("fs");
const p = "src/app/quote/[id]/page.tsx";
if (!fs.existsSync(p)) { console.error("! quote 페이지 없음"); process.exit(1); }
let s = fs.readFileSync(p, "utf8");

if (s.includes("invoiceKind")) { console.log("이미 적용되어 있습니다."); process.exit(0); }

// depositPct 계산 줄 근처에 kind 변수 추가
const anchor = "const depositPct: number = (p as any).depositPct ?? 30;";
if (!s.includes(anchor)) { console.log("! depositPct 앵커 못 찾음 — 수동 확인 필요 (분할행은 그대로 동작)"); process.exit(0); }
s = s.replace(anchor, anchor + '\n  const invoiceKind: string | null = (p as any).invoiceKind ?? null;\n  const kindKo = invoiceKind === "DEPOSIT" ? "계약금" : invoiceKind === "BALANCE" ? "잔금" : null;');

// 계약금/잔금 분할 tfoot 행을 kind 인보이스에서는 숨김: `${isInvoice && <>` 를 `${isInvoice && !invoiceKind && <>` 로
s = s.replace(/\{isInvoice && <>\s*\n(\s*)<tr className="bg-yellow-200/, '{isInvoice && !kindKo && <>\n$1<tr className="bg-yellow-200');

// 청구금액 라벨 아래(수신/금액 영역)에 kind 배지 추가 — "청구금액" 텍스트 앞
s = s.replace(
  '<span className="font-semibold">{isInvoice ? "청구금액" : "제안금액"} :</span>',
  '{kindKo && <span className="mr-1 rounded bg-yellow-200 px-1.5 py-0.5 text-xs font-bold">{kindKo} 청구</span>}<span className="font-semibold">{isInvoice ? "청구금액" : "제안금액"} :</span>'
);

fs.writeFileSync(p, s);
console.log("완료: quote 페이지에 invoiceKind 표시 반영");
