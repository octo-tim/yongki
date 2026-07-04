"use client";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { Building2, LogOut } from "lucide-react";

export function PortalHeader({ clientName, userName }: { clientName?: string; userName?: string | null }) {
  return (
    <header className="flex h-14 items-center justify-between border-b bg-card px-4 sm:px-6">
      <Link href="/portal" className="flex items-center gap-2">
        <Building2 className="h-5 w-5 text-primary" />
        <span className="font-semibold">{clientName ?? "코스메팩 파트너센터"}</span>
      </Link>
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span>{userName}</span>
        <button onClick={() => signOut({ callbackUrl: "/portal-login" })} className="flex items-center gap-1 rounded-md px-2 py-1 hover:bg-accent hover:text-foreground">
          <LogOut className="h-4 w-4" />로그아웃
        </button>
      </div>
    </header>
  );
}
