"use client";
import { useState } from "react";
import { ProposalManager } from "@/components/proposal-manager";
import { Send, Receipt } from "lucide-react";
import { cn } from "@/lib/utils";

type Opt = { id: string; name: string };

export function SalesManager({ proposals, clients }: { proposals: any[]; clients: Opt[] }) {
  const [tab, setTab] = useState<"PROPOSAL" | "INVOICE">("PROPOSAL");
  const cnt = (t: string) => proposals.filter((p) => (p.docType ?? "PROPOSAL") === t).length;

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button onClick={() => setTab("PROPOSAL")}
          className={cn("flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm font-medium", tab === "PROPOSAL" ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-accent")}>
          <Send className="h-4 w-4" />제안서발송 <span className="text-xs opacity-80">{cnt("PROPOSAL")}</span>
        </button>
        <button onClick={() => setTab("INVOICE")}
          className={cn("flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm font-medium", tab === "INVOICE" ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-accent")}>
          <Receipt className="h-4 w-4" />인보이스발송 <span className="text-xs opacity-80">{cnt("INVOICE")}</span>
        </button>
      </div>
      <ProposalManager key={tab} proposals={proposals} clients={clients} docType={tab} />
    </div>
  );
}
