"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/dashboard/sidebar";
import { TopBar } from "@/components/dashboard/TopBar";
import { SidebarProvider } from "@/contexts/sidebar-context";
import { ThemeProvider } from "@/components/providers/ThemeProvider";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isEditorPage = /^\/dashboard\/documents\/[^/]+$/.test(pathname);
  const isRagSearchPage = pathname === "/dashboard/rag-search";
  const isFullHeightPage = isEditorPage || isRagSearchPage;

  return (
    <ThemeProvider>
      <SidebarProvider>
        <div className="flex h-screen overflow-hidden">
          {!isEditorPage && <Sidebar />}
          <main className="flex-1 overflow-hidden flex flex-col">
            {!isFullHeightPage && <TopBar />}
            <div className={isFullHeightPage ? "flex-1 overflow-hidden" : "flex-1 overflow-y-auto bg-muted/10 p-6"}>
              {children}
            </div>
          </main>
        </div>
      </SidebarProvider>
    </ThemeProvider>
  );
}
