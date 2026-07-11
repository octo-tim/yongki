"use client";
import { useState } from "react";
import { ProposalManager } from "@/components/proposal-manager";
import { Send, Receipt, FlaskConical } from "lucide-react";
import { cn } from "@/lib/utils";

type Opt = { id: string; name: string };
type Tab = "PROPOSAL" | "INVOICE" | "SAMPLE";

export function SalesManager({ proposals, clients }: { proposals: any[]; clients: Opt[] }) {
  const [tab, setTab] = useState<Tab>("PROPOSAL");

  const isProposal = (p: any) => (p.docType ?? "PROPOSAL") === "PROPOSAL";
  const isSample = (p: any) => p.docType === "INVOICE" && p.invoiceKind === "SAMPLE";
  const isInvoice = (p: any) => p.docType === "INVOICE" && p.invoiceKind !== "SAMPLE"; // 샘플 제외 인보이스

  const proposalList = proposals.filter(isProposal);
  const invoiceList = proposals.filter(isInvoice);
  const sampleList = proposals.filter(isSample);

  const current = tab === "PROPOSAL" ? proposalList : tab === "SAMPLE" ? sampleList : invoiceList;
  const managerDocType = tab === "PROPOSAL" ? "PROPOSAL" : "INVOICE"; // 발행 폼 성격(샘플도 인보이스 계열)

  const tabCls = (active: boolean) =>
    cn("flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm font-medium",
      active ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-accent");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setTab("PROPOSAL")} className={tabCls(tab === "PROPOSAL")}>
          <Send className="h-4 w-4" />제안서발송 <span className="text-xs opacity-80">{proposalList.length}</span>
        </button>
        <button onClick={() => setTab("INVOICE")} className={tabCls(tab === "INVOICE")}>
          <Receipt className="h-4 w-4" />인보이스발송 <span className="text-xs opacity-80">{invoiceList.length}</span>
        </button>
        <button onClick={() => setTab("SAMPLE")} className={tabCls(tab === "SAMPLE")}>
          <FlaskConical className="h-4 w-4" />샘플인보이스발송 <span className="text-xs opacity-80">{sampleList.length}</span>
        </button>
      </div>
      <ProposalManager key={tab} proposals={current} clients={clients} docType={managerDocType as any} />
    </div>
  );
}
