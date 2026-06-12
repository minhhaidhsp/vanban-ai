"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Building2, FileText, FolderOpen, LayoutDashboard, LogOut,
  ScanText, Settings, Sparkles, User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import Cookies from "js-cookie";

const NAV_GROUPS = [
  {
    label: "NGHIỆP VỤ",
    items: [
      { href: "/dashboard", label: "Tổng quan", icon: LayoutDashboard },
      { href: "/dashboard/documents", label: "Tài liệu", icon: FileText },
      { href: "/dashboard/rag-search", label: "Tra cứu AI", icon: Sparkles },
    ],
  },
  {
    label: "KHO TRI THỨC",
    items: [
      { href: "/dashboard/reference-docs", label: "Kho văn bản", icon: FolderOpen },
      { href: "/dashboard/ocr", label: "OCR Văn bản", icon: ScanText },
    ],
  },
  {
    label: "HỆ THỐNG",
    items: [
      { href: "/dashboard/profile", label: "Tài khoản", icon: User },
      { href: "/dashboard/settings", label: "Cài đặt", icon: Settings },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    Cookies.remove("access_token");
    router.push("/login");
  };

  return (
    <aside className="flex w-60 flex-col border-r bg-card">
      <div className="flex h-16 items-center gap-2 px-4 border-b">
        <Building2 className="h-5 w-5 text-teal-600" />
        <span className="font-bold text-lg text-teal-600">CivicAI</span>
      </div>

      <nav className="flex-1 p-3 overflow-y-auto">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest px-3 pt-4 pb-1">
              {group.label}
            </p>
            {group.items.map(({ href, label, icon: Icon }) => {
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
        ))}
      </nav>

      <div className="p-3">
        <Separator className="mb-3" />
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
