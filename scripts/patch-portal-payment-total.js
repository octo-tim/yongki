const fs = require("fs");
const p = "src/app/portal/projects/[id]/page.tsx";
let s = fs.readFileSync(p, "utf8"); let log = [];
if (!/products:\s*\{/.test(s)) {
  const a = 'payments: { where: { side: "SALES" }, select: { id: true, type: true, amount: true, receivedAt: true, method: true } },';
  if (s.includes(a)) { s = s.replace(a, a + '\n      products: { orderBy: { createdAt: "asc" }, select: { quantity: true, salesPrice: true, salesCurrency: true, exchangeRate: true } },'); log.push("products 쿼리"); }
}
if (!s.includes("paymentTotal")) {
  const a = "  })();\n\n  return (";
  if (s.includes(a)) { s = s.replace(a, `  })();\n\n  const prod = (project as any).products?.[0] ?? null;\n  const qty = (project as any).quantity ?? 0;\n  const salesRmb = prod ? (prod.salesCurrency === "RMB" ? Number(prod.salesPrice ?? 0) : Number(prod.salesPrice ?? 0) * Number(prod.exchangeRate ?? 0)) : 0;\n  const salesConverted = !!prod && (prod.salesCurrency === "RMB" || Number(prod.exchangeRate ?? 0) > 0);\n  const salesUnit = salesConverted ? salesRmb : Number(prod?.salesPrice ?? 0);\n  const paymentTotal = qty * salesUnit;\n  const paymentCurrency = salesConverted ? "RMB" : (prod?.salesCurrency ?? "RMB");\n\n  return (`); log.push("전체금액 계산"); }
}
if (!/totalAmount=/.test(s)) { s = s.replace("<PortalPayments payments={project.payments as any} />", "<PortalPayments payments={project.payments as any} totalAmount={paymentTotal} currency={paymentCurrency} />"); log.push("전달"); }
fs.writeFileSync(p, s); console.log("포털전체금액:", log.join(", "));
