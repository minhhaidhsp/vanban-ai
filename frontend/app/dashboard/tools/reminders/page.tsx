"use client";

import { useState, useEffect, useCallback } from "react";
import { BellRing, ChevronDown, ChevronUp } from "lucide-react";
import { remindersApi, ReminderOut } from "@/lib/api/reminders";
import ReminderForm from "@/components/tools/reminders/ReminderForm";
import ReminderList from "@/components/tools/reminders/ReminderList";
import { Badge } from "@/components/ui/badge";

export default function RemindersPage() {
  const [reminders, setReminders] = useState<ReminderOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(true);

  const fetchReminders = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await remindersApi.getReminders();
      setReminders(data);
    } catch {
      setError("Không thể tải danh sách nhắc hẹn.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchReminders(); }, [fetchReminders]);

  const pendingCount = reminders.filter((r) => r.status === "pending").length;
  const hasReminders = reminders.length > 0;

  return (
    <div className="mx-auto max-w-6xl p-6">
      {/* Header */}
      <div className="mb-6 flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
          <BellRing className="h-5 w-5 text-primary" />
        </div>
        <h1 className="text-xl font-semibold">Đặt lịch nhắc hẹn</h1>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Form — left */}
        <div className="lg:col-span-1">
          <div className="rounded-xl border bg-card shadow-sm">
            {/* Form header — collapsible on mobile when there are reminders */}
            <div
              className={`flex items-center justify-between px-4 py-3 ${hasReminders ? "cursor-pointer lg:cursor-default" : ""}`}
              onClick={() => hasReminders && setShowForm((v) => !v)}
            >
              <h2 className="text-sm font-semibold">Tạo nhắc hẹn mới</h2>
              {hasReminders && (
                <button
                  type="button"
                  className="text-muted-foreground lg:hidden"
                  aria-label="Toggle form"
                >
                  {showForm ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
              )}
            </div>

            {/* Form body */}
            <div className={`px-4 pb-4 ${!showForm && hasReminders ? "hidden lg:block" : ""}`}>
              <ReminderForm onSuccess={fetchReminders} />
            </div>
          </div>
        </div>

        {/* List — right */}
        <div className="lg:col-span-2">
          <div className="min-h-[200px] rounded-xl border bg-card shadow-sm">
            <div className="flex items-center gap-2 px-4 py-3 border-b">
              <h2 className="text-sm font-semibold">Lịch nhắc</h2>
              {pendingCount > 0 && (
                <Badge className="h-5 rounded-full bg-primary/10 px-1.5 text-[11px] font-semibold text-primary hover:bg-primary/10">
                  {pendingCount}
                </Badge>
              )}
            </div>
            <div className="p-4">
              {loading ? (
                <div className="space-y-2.5">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
                  ))}
                </div>
              ) : (
                <ReminderList reminders={reminders} onRefresh={fetchReminders} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
