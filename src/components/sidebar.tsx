"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/components/i18n-provider";
import { LanguageToggle } from "@/components/language-toggle";
import { LayoutDashboard, Package, Building2, Factory, LogOut, PlusCircle, Settings, BarChart3, Wallet, ChevronLeft, ChevronRight, ClipboardList, FileText, Image as ImageIcon, Tag, HelpCircle, Archive, Send } from "lucide-react";

const baseNav = [
  { href: "/dashboard", key: "nav.dashboard", icon: LayoutDashboard },
  { href: "/tasks", key: "nav.tasks", icon: ClipboardList },
  { href: "/meetings", key: "nav.meetings", icon: FileText },
  { href: "/photos", key: "nav.photos", icon: ImageIcon },
  { href: "/projects", key: "nav.projects", icon: Package },
  { href: "/products", key: "nav.products", icon: Tag },
  { href: "/clients", key: "nav.clients", icon: Building2 },
  { href: "/factories", key: "nav.factories", icon: Factory },
  { href: "/proposals", key: "nav.proposals", icon: Send },
  { href: "/library", key: "nav.library", icon: Archive },
  { href: "/faq", key: "nav.faq", icon: HelpCircle },
  { href: "/sales", key: "nav.sales", icon: Wallet },
  { href: "/stats", key: "nav.stats", icon: BarChart3 },
];

const adminNav = [
  { href: "/admin", key: "nav.admin", icon: Settings },
];

export function Sidebar({ userName, userRole }: { userName?: string | null; userRole?: string }) {
  const pathname = usePathname();
  const { t } = useI18n();
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
            <span className="truncate font-semibold">Cosmepack</span>
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
              title={collapsed ? t(item.key) : undefined}
              className={cn(
                "flex items-center rounded-md py-2 text-sm font-medium transition-colors",
                collapsed ? "justify-center px-2" : "gap-3 px-3",
                active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="truncate">{t(item.key)}</span>}
            </Link>
          );
        })}
      </nav>

      <div className={cn("space-y-2 border-t p-3", collapsed && "px-2")}>
        <div className={cn(collapsed ? "flex justify-center" : "px-1")}>
          <LanguageToggle collapsed={collapsed} />
        </div>
        {!collapsed && <div className="px-3 py-1 text-xs text-muted-foreground truncate">{userName ?? "사용자"}</div>}
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          title={collapsed ? t("nav.logout") : undefined}
          className={cn(
            "flex w-full items-center rounded-md py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
            collapsed ? "justify-center px-2" : "gap-3 px-3"
          )}
        >
          <LogOut className="h-4 w-4 shrink-0" /> {!collapsed && t("nav.logout")}
        </button>
      </div>
    </aside>
  );
}
