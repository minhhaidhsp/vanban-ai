"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Building2, LayoutDashboard, FilePlus, Search, BookOpen,
  ScanText, Settings, Users, LogOut,
  PanelLeftClose, PanelLeftOpen, ChevronRight,
  Mic, ImagePlus, BellRing, type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import Cookies from "js-cookie";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useSidebar } from "@/contexts/sidebar-context";

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
      { href: "/dashboard",                label: "Tổng quan",        icon: LayoutDashboard },
      { href: "/dashboard/documents",      label: "Tạo văn bản",      icon: FilePlus        },
      { href: "/dashboard/rag-search",     label: "Tra cứu văn bản",  icon: Search          },
      { href: "/dashboard/reference-docs", label: "Kho văn bản",      icon: BookOpen        },
    ],
  },
  {
    label: "CÔNG CỤ",
    items: [
      { href: "/dashboard/ocr",                     label: "OCR Văn bản",       icon: ScanText  },
      { href: "/dashboard/tools/speech-to-text",   label: "Speech to Text",    icon: Mic       },
      { href: "/dashboard/tools/image-generation", label: "Tạo hình ảnh",      icon: ImagePlus },
      { href: "/dashboard/tools/reminders",        label: "Đặt lịch nhắc hẹn", icon: BellRing  },
    ],
  },
  {
    label: "QUẢN TRỊ",
    items: [
      { href: "/dashboard/settings", label: "Cài đặt",      icon: Settings },
      { href: "/dashboard/admin",    label: "Quản lý User", icon: Users, requiredRole: "admin" },
    ],
  },
];

const ROLE_LABEL: Record<string, string> = {
  admin:  "Quản trị viên",
  leader: "Lãnh đạo",
  staff:  "Cán bộ",
};

export function Sidebar() {
  const pathname = usePathname();
  const router   = useRouter();
  const { user, isAdmin, isLeader } = useCurrentUser();
  const { collapsed, toggle } = useSidebar();

  const handleLogout = () => {
    Cookies.remove("access_token");
    router.push("/login");
  };

  const isItemVisible = (item: NavItem) => {
    if (!item.requiredRole) return true;
    if (item.requiredRole === "admin")  return isAdmin;
    if (item.requiredRole === "leader") return isLeader;
    return true;
  };

  const avatarLetter = user?.full_name?.trim().charAt(0).toUpperCase() ?? "U";
  const roleLabel    = user ? (ROLE_LABEL[user.role] ?? user.role) : "";

  return (
    <aside className={cn(
      "flex flex-col transition-all duration-200 shrink-0 bg-white border-r border-gray-200",
      collapsed ? "w-14" : "w-60"
    )}>
      {/* Header */}
      <div className={cn(
        "flex h-16 items-center border-b border-gray-200",
        collapsed ? "flex-col justify-center gap-1 py-2" : "justify-between px-4"
      )}>
        <div className={cn("flex items-center", collapsed ? "" : "gap-2")}>
          <Building2 className="h-5 w-5 text-[var(--brand-600)]" />
          {!collapsed && <span className="font-bold text-lg text-[var(--brand-600)]">CivicAI</span>}
        </div>
        <button
          onClick={toggle}
          title={collapsed ? "Mở rộng sidebar" : "Thu gọn sidebar"}
          className="text-gray-400 hover:text-gray-700 p-1 rounded transition-colors"
        >
          {collapsed
            ? <PanelLeftOpen  className="h-4 w-4" />
            : <PanelLeftClose className="h-4 w-4" />
          }
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 overflow-y-auto">
        {NAV_GROUPS.map((group) => {
          const visibleItems = group.items.filter(isItemVisible);
          if (!visibleItems.length) return null;
          return (
            <div key={group.label}>
              {!collapsed && (
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest px-3 pt-4 pb-1">
                  {group.label}
                </p>
              )}
              {collapsed && <div className="pt-4" />}
              {visibleItems.map(({ href, label, icon: Icon }) => {
                const active = pathname === href;
                return (
                  <Link key={href} href={href}>
                    <span
                      title={label}
                      className={cn(
                        "flex items-center rounded-md py-2 text-base transition-colors",
                        collapsed ? "justify-center px-0" : "gap-3 px-3",
                        active
                          ? "bg-[var(--brand-600)] text-white font-medium rounded-l-none mr-2"
                          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                      )}
                    >
                      <Icon className={cn("h-4 w-4 shrink-0", active ? "text-white" : "")} />
                      {!collapsed && label}
                    </span>
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3">
        <Separator className="mb-2 bg-gray-200" />

        {/* User card → /dashboard/profile */}
        {user && (
          <button
            type="button"
            onClick={() => router.push("/dashboard/profile")}
            title={collapsed ? "Tài khoản" : undefined}
            className={cn(
              "w-full flex items-center mb-1 rounded-lg transition-colors hover:bg-gray-100",
              collapsed ? "justify-center p-2" : "gap-3 px-2 py-2"
            )}
          >
            <div className="w-8 h-8 rounded-full bg-[var(--brand-600)] flex items-center justify-center shrink-0">
              <span className="text-white text-sm font-medium">{avatarLetter}</span>
            </div>
            {!collapsed && (
              <>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate leading-tight">{user.full_name}</p>
                  <p className="text-xs text-gray-500">{roleLabel}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
              </>
            )}
          </button>
        )}

        <Button
          variant="ghost"
          className={cn(
            "w-full gap-3 text-base text-gray-500 hover:text-red-600",
            collapsed ? "justify-center px-0" : "justify-start"
          )}
          title={collapsed ? "Đăng xuất" : undefined}
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && "Đăng xuất"}
        </Button>
      </div>
    </aside>
  );
}
