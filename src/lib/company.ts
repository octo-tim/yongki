// 견적서(제안서) 공급자 정보 — 필요 시 이 파일만 수정하면 모든 견적서에 반영됩니다.
export const COMPANY = {
  name: "(주)비케이브로",
  ceo: "백상선",
  address: "10257 경기도 고양시 일산동구 문봉길 44-75 (문봉동) 코스메팩",
  tel: "031-977-7322",
  bizNo: "452-81-02979",
  mailOrderNo: "2023-고양일산동-0104", // 통신판매업 신고번호
  privacyOfficer: "이수림", // 개인정보보호책임자
};

export type QuoteItem = { name: string; spec?: string; qty: number; unitPrice: number };

export function quoteTotals(items: QuoteItem[], vatApplied: boolean) {
  const supply = items.reduce((a, it) => a + (Number(it.qty) || 0) * (Number(it.unitPrice) || 0), 0);
  const vat = vatApplied ? Math.round(supply * 0.1) : 0;
  return { supply, vat, total: supply + vat };
}
