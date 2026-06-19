"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Package, Building2, Factory, LogOut, PlusCircle, Users, SlidersHorizontal, ListChecks } from "lucide-react";

const baseNav = [
  { href: "/dashboard", label: "대시보드", icon: LayoutDashboard },
  { href: "/projects", label: "프로젝트", icon: Package },
  { href: "/projects/new", label: "프로젝트 등록", icon: PlusCircle },
  { href: "/clients", label: "업체 관리", icon: Building2 },
  { href: "/factories", label: "공장 관리", icon: Factory },
];

const adminNav = [
  { href: "/users", label: "사용자 관리", icon: Users },
  { href: "/admin/statuses", label: "상태 관리", icon: SlidersHorizontal },
  { href: "/admin/steps", label: "단계 관리", icon: ListChecks },
];

export function Sidebar({ userName, userRole }: { userName?: string | null; userRole?: string }) {
  const pathname = usePathname();
  const nav = userRole === "ADMIN" ? [...baseNav, ...adminNav] : baseNav;
  return (
    <aside className="flex w-60 shrink-0 flex-col border-r bg-card">
      <div className="flex h-14 items-center gap-2 border-b px-5">
        <Package className="h-5 w-5 text-primary" />
        <span className="font-semibold">용기 제작관리</span>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {nav.map((item) => {
          const active = item.href === "/projects"
            ? pathname === "/projects" || (pathname.startsWith("/projects/") && pathname !== "/projects/new")
            : pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t p-3">
        <div className="px-3 py-2 text-xs text-muted-foreground">{userName ?? "사용자"}</div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <LogOut className="h-4 w-4" /> 로그아웃
        </button>
      </div>
    </aside>
  );
}
