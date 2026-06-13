"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Building2, FileText, FolderOpen, LayoutDashboard, LogOut,
  ScanText, Settings, Sparkles, User, Users, type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import Cookies from "js-cookie";
import { useCurrentUser } from "@/hooks/useCurrentUser";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  requiredRole?: "admin" | "leader";
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    label: "NGHIỆP VỤ",
    items: [
      { href: "/dashboard",           label: "Tổng quan",  icon: LayoutDashboard },
      { href: "/dashboard/documents", label: "Tài liệu",   icon: FileText },
      { href: "/dashboard/rag-search",label: "Tra cứu AI", icon: Sparkles },
    ],
  },
  {
    label: "KHO TRI THỨC",
    items: [
      { href: "/dashboard/reference-docs", label: "Kho văn bản",  icon: FolderOpen },
      { href: "/dashboard/ocr",            label: "OCR Văn bản",  icon: ScanText },
    ],
  },
  {
    label: "HỆ THỐNG",
    items: [
      { href: "/dashboard/profile",  label: "Tài khoản",     icon: User },
      { href: "/dashboard/settings", label: "Cài đặt",       icon: Settings },
      { href: "/dashboard/admin",    label: "Quản lý User",  icon: Users, requiredRole: "admin" },
    ],
  },
];

const ROLE_BADGE: Record<string, { label: string; className: string }> = {
  admin:  { label: "Quản trị", className: "bg-red-100 text-red-700" },
  leader: { label: "Lãnh đạo", className: "bg-purple-100 text-purple-700" },
  staff:  { label: "Cán bộ",   className: "bg-teal-100 text-teal-700" },
};

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAdmin, isLeader } = useCurrentUser();

  const handleLogout = () => {
    Cookies.remove("access_token");
    router.push("/login");
  };

  const isItemVisible = (item: NavItem) => {
    if (!item.requiredRole) return true;
    if (item.requiredRole === "admin") return isAdmin;
    if (item.requiredRole === "leader") return isLeader;
    return true;
  };

  return (
    <aside className="flex w-60 flex-col border-r bg-card">
      <div className="flex h-16 items-center gap-2 px-4 border-b">
        <Building2 className="h-5 w-5 text-teal-600" />
        <span className="font-bold text-lg text-teal-600">CivicAI</span>
      </div>

      <nav className="flex-1 p-3 overflow-y-auto">
        {NAV_GROUPS.map((group) => {
          const visibleItems = group.items.filter(isItemVisible);
          if (!visibleItems.length) return null;
          return (
            <div key={group.label}>
              <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest px-3 pt-4 pb-1">
                {group.label}
              </p>
              {visibleItems.map(({ href, label, icon: Icon }) => {
                const active = pathname === href;
                return (
                  <Link key={href} href={href}>
                    <span
                      className={cn(
                        "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                        active
                          ? "bg-teal-50 text-teal-700 font-medium"
                          : "text-foreground hover:bg-teal-50/50 hover:text-teal-600"
                      )}
                    >
                      <Icon className={cn("h-4 w-4", active ? "text-teal-600" : "")} />
                      {label}
                    </span>
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      <div className="p-3">
        <Separator className="mb-2" />
        {user && (
          <div className="px-1 py-2 mb-1">
            <p className="text-xs font-medium text-slate-700 truncate">{user.full_name}</p>
            <p className="text-[11px] text-slate-400 truncate mb-1">{user.email}</p>
            <span className={cn(
              "text-[10px] px-2 py-0.5 rounded-full font-medium",
              ROLE_BADGE[user.role]?.className ?? "bg-slate-100 text-slate-600"
            )}>
              {ROLE_BADGE[user.role]?.label ?? user.role}
            </span>
          </div>
        )}
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-sm text-muted-foreground hover:text-destructive"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          Đăng xuất
        </Button>
      </div>
    </aside>
  );
}
