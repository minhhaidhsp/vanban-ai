"use client";

import { BellOff, CheckCircle, RefreshCw, Trash2 } from "lucide-react";
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

function dotColor(r: ReminderOut): string {
  if (r.status === "done") return "bg-green-500";
  if (r.status === "cancelled") return "bg-gray-400";
  const deadline = new Date(new Date().getTime() + 24 * 60 * 60 * 1000);
  return new Date(r.remind_at) < deadline ? "bg-red-500" : "bg-blue-500";
}

function StatusBadge({ status }: { status: string }) {
  if (status === "done")
    return (
      <Badge className="border-transparent bg-green-100 text-green-700 hover:bg-green-100">
        Hoàn thành
      </Badge>
    );
  if (status === "cancelled") return <Badge variant="outline">Đã hủy</Badge>;
  return (
    <Badge variant="outline" className="border-blue-300 text-blue-600">
      Chờ nhắc
    </Badge>
  );
}

function ReminderItem({
  r,
  onRefresh,
}: {
  r: ReminderOut;
  onRefresh: () => void;
}) {
  const handleMarkDone = async () => {
    await remindersApi.updateReminder(r.id, { status: "done" });
    onRefresh();
  };

  const handleDelete = async () => {
    if (!window.confirm("Xóa nhắc hẹn này?")) return;
    await remindersApi.deleteReminder(r.id);
    onRefresh();
  };

  const handleResend = async () => {
    await remindersApi.resendReminder(r.id);
  };

  return (
    <div className="flex items-start gap-3 rounded-lg border bg-card p-3">
      <span
        className={`mt-1.5 h-2.5 w-2.5 flex-shrink-0 rounded-full ${dotColor(r)}`}
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium leading-snug">{r.title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {formatVN(r.remind_at)}
        </p>
        {r.document_title && (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            📄 {r.document_title}
          </p>
        )}
        {r.recipients.length > 0 && (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            Đã gửi đến: {r.recipients.join(", ")}
          </p>
        )}
        <div className="mt-1.5">
          <StatusBadge status={r.status} />
        </div>
      </div>
      <div className="flex flex-shrink-0 flex-col gap-1">
        {r.recipients.length > 0 && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2 text-xs"
            onClick={handleResend}
            title="Gửi lại email"
          >
            <RefreshCw className="mr-1 h-3 w-3" />
            Gửi lại
          </Button>
        )}
        {r.status === "pending" && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 border-green-300 px-2 text-xs text-green-600 hover:bg-green-50"
            onClick={handleMarkDone}
          >
            <CheckCircle className="mr-1 h-3 w-3" />
            Xong
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10"
          onClick={handleDelete}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

function Group({
  title,
  items,
  onRefresh,
}: {
  title: string;
  items: ReminderOut[];
  onRefresh: () => void;
}) {
  if (items.length === 0) return null;
  return (
    <div className="mb-6">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      <div className="space-y-2">
        {items.map((r) => (
          <ReminderItem key={r.id} r={r} onRefresh={onRefresh} />
        ))}
      </div>
    </div>
  );
}

export default function ReminderList({ reminders, onRefresh }: Props) {
  if (reminders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
        <BellOff className="mb-3 h-10 w-10 opacity-40" />
        <p>Chưa có lịch nhắc nào</p>
      </div>
    );
  }

  const now = new Date();
  const upcoming = reminders.filter(
    (r) => r.status === "pending" && new Date(r.remind_at) > now
  );
  const overdue = reminders.filter(
    (r) => r.status === "pending" && new Date(r.remind_at) <= now
  );
  const done = reminders.filter(
    (r) => r.status === "done" || r.status === "cancelled"
  );

  return (
    <div>
      <Group title="Sắp tới" items={upcoming} onRefresh={onRefresh} />
      <Group title="Đã qua" items={overdue} onRefresh={onRefresh} />
      <Group title="Hoàn thành / Đã hủy" items={done} onRefresh={onRefresh} />
    </div>
  );
}
