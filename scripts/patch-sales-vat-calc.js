// 부가세율(salesVatRate)을 API 저장 + 직원 상세/포털 전체금액 계산에 반영.
// 실행: node scripts/patch-sales-vat-calc.js
const fs = require("fs");
function edit(path, fn) {
  if (!fs.existsSync(path)) { console.log("! 파일 없음:", path); return; }
  let s = fs.readFileSync(path, "utf8"); const before = s; s = fn(s);
  if (s !== before) { fs.writeFileSync(path, s); console.log("+ 수정:", path); }
  else console.log("= 변경없음:", path);
}

// 1) products POST: salesVatRate 저장
edit("src/app/api/products/route.ts", (s) => {
  if (s.includes("salesVatRate")) return s;
  return s.replace("      exchangeRate: num(b.exchangeRate),\n", "      exchangeRate: num(b.exchangeRate),\n      salesVatRate: b.salesVatRate == null || b.salesVatRate === \"\" ? 10 : num(b.salesVatRate),\n");
});

// 2) products PATCH: salesVatRate 저장
edit("src/app/api/products/[id]/route.ts", (s) => {
  if (s.includes("salesVatRate")) return s;
  return s.replace('  if ("exchangeRate" in b) data.exchangeRate = num(b.exchangeRate);\n', '  if ("exchangeRate" in b) data.exchangeRate = num(b.exchangeRate);\n  if ("salesVatRate" in b) data.salesVatRate = b.salesVatRate === "" ? 10 : num(b.salesVatRate);\n');
});

// 3) 직원 프로젝트 상세: salesTotal에 부가세 반영
edit("src/app/(dashboard)/projects/[id]/page.tsx", (s) => {
  if (s.includes("salesVatRate")) return s;
  // salesUnit 다음 줄에 vat 반영
  return s.replace(
    "  const paymentTotals = {\n    salesTotal: qty * salesUnit,",
    "  const salesVatRate = Number(prod?.salesVatRate ?? 10);\n  const salesTotalBase = qty * salesUnit;\n  const paymentTotals = {\n    salesTotal: salesTotalBase * (1 + salesVatRate / 100),\n    salesVatRate,\n    salesSupply: salesTotalBase,"
  );
});

// 4) 직원 상세 쿼리: products select에 salesVatRate 포함 (있으면)
edit("src/app/(dashboard)/projects/[id]/page.tsx", (s) => {
  if (/products:\s*\{[^}]*salesVatRate/.test(s)) return s;
  return s.replace(/(products:\s*\{[^}]*select:\s*\{[^}]*exchangeRate:\s*true)/, "$1, salesVatRate: true");
});

// 5) 포털 상세: products select + 계산에 부가세
edit("src/app/portal/projects/[id]/page.tsx", (s) => {
  let out = s;
  // select에 salesVatRate
  if (!/products:\s*\{[^}]*salesVatRate/.test(out)) {
    out = out.replace(/(products:\s*\{ orderBy:\s*\{ createdAt:\s*"asc" \}, select:\s*\{ quantity:\s*true, salesPrice:\s*true, salesCurrency:\s*true, exchangeRate:\s*true)/, "$1, salesVatRate: true");
  }
  // 계산: paymentTotal에 부가세 반영
  if (!out.includes("portalVatRate")) {
    out = out.replace(
      "  const paymentTotal = qty * salesUnit;",
      "  const portalVatRate = Number(prod?.salesVatRate ?? 10);\n  const paymentTotal = qty * salesUnit * (1 + portalVatRate / 100);"
    );
  }
  return out;
});

console.log("완료");
