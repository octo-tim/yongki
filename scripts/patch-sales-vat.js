// Product에 판매 부가세율(salesVatRate) 필드 추가. 실행: node scripts/patch-sales-vat.js
const fs = require("fs");
const p = "prisma/schema.prisma";
let s = fs.readFileSync(p, "utf8");
const start = s.indexOf("model Product {");
if (start === -1) { console.error("! Product 모델 없음"); process.exit(1); }
const end = s.indexOf("\n}", start);
let block = s.slice(start, end);
if (block.includes("salesVatRate")) { console.log("이미 적용되어 있습니다."); process.exit(0); }
const m = block.match(/\n\s*exchangeRate\s+Decimal\?[^\n]*/);
if (!m) { console.error("! exchangeRate 앵커 못 찾음"); process.exit(1); }
const idx = block.indexOf(m[0]) + m[0].length;
block = block.slice(0, idx) + "\n  salesVatRate   Decimal? @default(10) @db.Decimal(5, 2) // 판매 부가세율(%) 기본 10" + block.slice(idx);
s = s.slice(0, start) + block + s.slice(end);
fs.writeFileSync(p, s);
console.log("완료: Product.salesVatRate 추가");
