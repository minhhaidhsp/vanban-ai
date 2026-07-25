"use client";

import { NotificationBell } from "@/components/dashboard/NotificationBell";

export function TopBar() {
  return (
    <div className="h-12 shrink-0 flex items-center justify-end gap-2 px-4 border-b bg-background">
      <NotificationBell />
    </div>
  );
}
