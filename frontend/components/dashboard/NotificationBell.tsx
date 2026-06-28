"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCircle2, Clock, FolderPlus, AlertCircle, Check } from "lucide-react";
import { hoSoApi, type NotificationDto } from "@/lib/api";
import { cn } from "@/lib/utils";

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60_000);
  const h = Math.floor(min / 60);
  const d = Math.floor(h / 24);
  if (min < 1) return "vừa xong";
  if (min < 60) return `${min} phút trước`;
  if (h < 24) return `${h} giờ trước`;
  if (d === 1) return "hôm qua";
  return new Date(iso).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}

function NotifIcon({ loai }: { loai: NotificationDto["loai"] }) {
  if (loai === "hoan_thanh")
    return <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />;
  if (loai === "cho_bo_sung")
    return <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />;
  if (loai === "buoc_hoan_thanh")
    return <Clock className="h-4 w-4 text-blue-500 shrink-0" />;
  return <FolderPlus className="h-4 w-4 text-primary shrink-0" />;
}

interface Props {
  collapsed?: boolean;
}

export function NotificationBell({ collapsed }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationDto[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Poll unread count every 30s
  useEffect(() => {
    const fetch = () =>
      hoSoApi.notifications.unreadCount()
        .then((d) => setUnread(d.count))
        .catch(() => {});
    fetch();
    const id = setInterval(fetch, 30_000);
    return () => clearInterval(id);
  }, []);

  // Click outside → close
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleOpen = async () => {
    const next = !open;
    setOpen(next);
    if (next) {
      setLoading(true);
      try {
        const res = await hoSoApi.notifications.list();
        setItems(res.items);
        setUnread(res.unread_count);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
  };

  const handleMarkRead = async (notif: NotificationDto) => {
    if (!notif.da_doc) {
      await hoSoApi.notifications.markRead(notif.id).catch(() => {});
      setItems((prev) => prev.map((n) => n.id === notif.id ? { ...n, da_doc: true } : n));
      setUnread((c) => Math.max(0, c - 1));
    }
    setOpen(false);
    router.push(`/dashboard/ho-so/${notif.ho_so_id}`);
  };

  const handleMarkAllRead = async () => {
    await hoSoApi.notifications.markAllRead().catch(() => {});
    setItems((prev) => prev.map((n) => ({ ...n, da_doc: true })));
    setUnread(0);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={handleOpen}
        title="Thông báo hồ sơ"
        className={cn(
          "relative flex items-center justify-center rounded-md transition-colors text-gray-500 hover:text-gray-900 hover:bg-gray-100",
          collapsed ? "h-9 w-9" : "h-9 w-9"
        )}
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white leading-none">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute bottom-full mb-2 left-0 w-80 bg-background border rounded-lg shadow-lg z-50 flex flex-col max-h-[420px]">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b">
            <span className="text-sm font-medium">Thông báo</span>
            {unread > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <Check className="h-3 w-3" />
                Đánh dấu tất cả đã đọc
              </button>
            )}
          </div>

          {/* List */}
          <div className="overflow-y-auto flex-1">
            {loading ? (
              <div className="px-4 py-6 text-center text-sm text-muted-foreground">Đang tải...</div>
            ) : items.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Bell className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">Không có thông báo mới</p>
              </div>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleMarkRead(n)}
                  className={cn(
                    "w-full flex items-start gap-3 px-3 py-3 text-left hover:bg-muted/50 transition-colors border-b last:border-0",
                    !n.da_doc && "bg-primary/5"
                  )}
                >
                  <NotifIcon loai={n.loai} />
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm leading-snug truncate", !n.da_doc ? "font-medium" : "text-muted-foreground")}>
                      {n.tieu_de}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{n.noi_dung}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1">{relTime(n.created_at)}</p>
                  </div>
                  {!n.da_doc && (
                    <span className="mt-1 h-2 w-2 rounded-full bg-primary shrink-0" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
