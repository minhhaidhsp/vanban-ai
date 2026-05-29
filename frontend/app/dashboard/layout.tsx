"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/dashboard/sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Hide sidebar for all document editor pages (including /new)
  const isEditorPage = /^\/dashboard\/documents\/[^/]+$/.test(pathname);
  console.log("pathname:", pathname, "isEditorPage:", isEditorPage);

  return (
    <div className="flex h-screen overflow-hidden">
      {!isEditorPage && <Sidebar />}
      <main className={`flex-1 overflow-hidden ${isEditorPage ? "" : "overflow-y-auto bg-muted/10 p-6"}`}>
        {children}
      </main>
    </div>
  );
}
