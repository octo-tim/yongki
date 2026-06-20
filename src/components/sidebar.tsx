"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Package, Building2, Factory, LogOut, PlusCircle, Settings, BarChart3, Wallet, ChevronLeft, ChevronRight, ClipboardList, FileText, Image as ImageIcon, Tag } from "lucide-react";

const baseNav = [
  { href: "/dashboard", label: "대시보드", icon: LayoutDashboard },
  { href: "/tasks", label: "업무관리", icon: ClipboardList },
  { href: "/meetings", label: "회의록", icon: FileText },
  { href: "/photos", label: "진행사진", icon: ImageIcon },
  { href: "/projects", label: "프로젝트관리", icon: Package },
  { href: "/products", label: "품목관리", icon: Tag },
  { href: "/clients", label: "업체 관리", icon: Building2 },
  { href: "/factories", label: "공장 관리", icon: Factory },
  { href: "/sales", label: "매출현황", icon: Wallet },
  { href: "/stats", label: "통계", icon: BarChart3 },
];

const adminNav = [
  { href: "/admin", label: "관리자 (사용자·단계)", icon: Settings },
];

export function Sidebar({ userName, userRole }: { userName?: string | null; userRole?: string }) {
  const pathname = usePathname();
  const nav = userRole === "ADMIN" ? [...baseNav, ...adminNav] : baseNav;

  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    if (localStorage.getItem("sidebar-collapsed") === "1") setCollapsed(true);
  }, []);
  function toggle() {
    setCollapsed((c) => {
      const next = !c;
      localStorage.setItem("sidebar-collapsed", next ? "1" : "0");
      return next;
    });
  }

  return (
    <aside className={cn("flex shrink-0 flex-col border-r bg-card transition-all duration-200", collapsed ? "w-16" : "w-60")}>
      <div className={cn("flex h-14 items-center border-b", collapsed ? "justify-center px-2" : "justify-between px-4")}>
        {!collapsed && (
          <div className="flex items-center gap-2 overflow-hidden">
            <Package className="h-5 w-5 shrink-0 text-primary" />
            <span className="truncate font-semibold">용기 제작관리</span>
          </div>
        )}
        <button onClick={toggle} title={collapsed ? "사이드바 펼치기" : "사이드바 접기"}
          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      <nav className={cn("flex-1 space-y-1 p-3", collapsed && "px-2")}>
        {nav.map((item) => {
          const active = item.href === "/projects"
            ? pathname === "/projects" || (pathname.startsWith("/projects/") && pathname !== "/projects/new")
            : pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center rounded-md py-2 text-sm font-medium transition-colors",
                collapsed ? "justify-center px-2" : "gap-3 px-3",
                active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className={cn("border-t p-3", collapsed && "px-2")}>
        {!collapsed && <div className="px-3 py-2 text-xs text-muted-foreground truncate">{userName ?? "사용자"}</div>}
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          title={collapsed ? "로그아웃" : undefined}
          className={cn(
            "flex w-full items-center rounded-md py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
            collapsed ? "justify-center px-2" : "gap-3 px-3"
          )}
        >
          <LogOut className="h-4 w-4 shrink-0" /> {!collapsed && "로그아웃"}
        </button>
      </div>
    </aside>
  );
}
