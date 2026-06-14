"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/dashboard/sidebar";
import { SidebarProvider } from "@/contexts/sidebar-context";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isEditorPage = /^\/dashboard\/documents\/[^/]+$/.test(pathname);
  const isRagSearchPage = pathname === "/dashboard/rag-search";
  const isFullHeightPage = isEditorPage || isRagSearchPage;

  return (
    <SidebarProvider>
      <div className="flex h-screen overflow-hidden">
        {!isEditorPage && <Sidebar />}
        <main className={`flex-1 overflow-hidden ${isFullHeightPage ? "" : "overflow-y-auto bg-muted/10 p-6"}`}>
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
}
