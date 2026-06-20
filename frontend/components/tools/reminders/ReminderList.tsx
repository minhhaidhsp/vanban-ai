"use client";

import { BellOff, Check, RefreshCw, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ReminderOut, remindersApi } from "@/lib/api/reminders";

interface Props {
  reminders: ReminderOut[];
  onRefresh: () => void;
}

function formatVN(isoString: string): string {
  const d = new Date(isoString);
  const vnMs = d.getTime() + 7 * 60 * 60 * 1000;
  const v = new Date(vnMs);
  const hh = String(v.getUTCHours()).padStart(2, "0");
  const mm = String(v.getUTCMinutes()).padStart(2, "0");
  const dd = String(v.getUTCDate()).padStart(2, "0");
  const mo = String(v.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = v.getUTCFullYear();
  return `${hh}:${mm} - ${dd}/${mo}/${yyyy}`;
}

function relativeTime(isoString: string): string {
  const diff = new Date(isoString).getTime() - Date.now();
  const abs = Math.abs(diff);
  const future = diff > 0;
  if (abs < 60_000) return future ? "vài giây nữa" : "vừa xong";
  if (abs < 3_600_000) {
    const m = Math.round(abs / 60_000);
    return future ? `còn ${m} phút` : `${m} phút trước`;
  }
  if (abs < 86_400_000) {
    const h = Math.round(abs / 3_600_000);
    return future ? `còn ${h} giờ` : `${h} giờ trước`;
  }
  const days = Math.round(abs / 86_400_000);
  return future ? `còn ${days} ngày` : `${days} ngày trước`;
}

function itemBorderClass(r: ReminderOut): string {
  if (r.status === "done" || r.status === "cancelled") return "border-l-green-400";
  const t = new Date(r.remind_at);
  const now = new Date();
  if (t <= now) return "border-l-orange-400";
  if (t.getTime() - now.getTime() < 86_400_000) return "border-l-red-400";
  return "border-l-blue-400";
}

function StatusBadge({ status }: { status: string }) {
  if (status === "done")
    return <Badge className="border-transparent bg-green-100 text-green-700 hover:bg-green-100 text-[11px]">Hoàn thành</Badge>;
  if (status === "cancelled")
    return <Badge variant="outline" className="text-[11px]">Đã hủy</Badge>;
  return <Badge variant="outline" className="border-blue-300 text-blue-600 text-[11px]">Chờ nhắc</Badge>;
}

function ReminderItem({ r, onRefresh }: { r: ReminderOut; onRefresh: () => void }) {
  const handleMarkDone = async () => { await remindersApi.updateReminder(r.id, { status: "done" }); onRefresh(); };
  const handleDelete = async () => { if (!window.confirm("Xóa nhắc hẹn này?")) return; await remindersApi.deleteReminder(r.id); onRefresh(); };
  const handleResend = async () => { await remindersApi.resendReminder(r.id); };

  const isDone = r.status !== "pending";

  return (
    <div
      className={`flex items-start gap-3 rounded-lg border border-l-4 bg-card p-3 transition-colors hover:bg-accent/50 ${itemBorderClass(r)} ${isDone ? "opacity-60" : ""}`}
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium leading-snug">{r.title}</p>

        <span
          className="mt-0.5 block text-xs text-muted-foreground"
          title={formatVN(r.remind_at)}
        >
          {relativeTime(r.remind_at)}
        </span>

        {r.document_title && (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">📄 {r.document_title}</p>
        )}

        {r.recipients.length > 0 && (
          <div className="mt-1.5 flex flex-wrap items-center gap-1">
            {r.recipients.slice(0, 4).map((email) => (
              <span
                key={email}
                title={email}
                className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary"
              >
                {email[0].toUpperCase()}
              </span>
            ))}
            {r.recipients.length > 4 && (
              <span className="text-[10px] text-muted-foreground">+{r.recipients.length - 4}</span>
            )}
          </div>
        )}

        <div className="mt-1.5">
          <StatusBadge status={r.status} />
        </div>
      </div>

      <div className="flex flex-shrink-0 items-center gap-1">
        {r.recipients.length > 0 && (
          <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={handleResend} title="Gửi lại email">
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        )}
        {r.status === "pending" && (
          <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600 hover:bg-green-50 hover:text-green-700" onClick={handleMarkDone} title="Đánh dấu xong">
            <Check className="h-3.5 w-3.5" />
          </Button>
        )}
        <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" onClick={handleDelete} title="Xóa">
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

function Group({ title, items, onRefresh }: { title: string; items: ReminderOut[]; onRefresh: () => void }) {
  if (items.length === 0) return null;
  return (
    <div className="mb-5">
      <div className="mb-2.5 flex items-center gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </span>
        <div className="h-px flex-1 bg-border" />
        <span className="text-[11px] text-muted-foreground">{items.length}</span>
      </div>
      <div className="space-y-1.5">
        {items.map((r) => <ReminderItem key={r.id} r={r} onRefresh={onRefresh} />)}
      </div>
    </div>
  );
}

export default function ReminderList({ reminders, onRefresh }: Props) {
  if (reminders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
          <BellOff className="h-7 w-7 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-foreground">Chưa có lịch nhắc nào</p>
        <p className="mt-1 text-xs text-muted-foreground">Tạo nhắc hẹn đầu tiên ở bên trái</p>
      </div>
    );
  }

  const now = new Date();
  const upcoming = reminders.filter((r) => r.status === "pending" && new Date(r.remind_at) > now);
  const overdue  = reminders.filter((r) => r.status === "pending" && new Date(r.remind_at) <= now);
  const done     = reminders.filter((r) => r.status === "done" || r.status === "cancelled");

  return (
    <div>
      <Group title="Sắp tới" items={upcoming} onRefresh={onRefresh} />
      <Group title="Đã qua" items={overdue} onRefresh={onRefresh} />
      <Group title="Hoàn thành" items={done} onRefresh={onRefresh} />
    </div>
  );
}
