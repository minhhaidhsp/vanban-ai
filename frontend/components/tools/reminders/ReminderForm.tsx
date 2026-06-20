"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { remindersApi, ReminderCreate } from "@/lib/api/reminders";
import { documentApi, DocumentDto } from "@/lib/api";
import EmailRecipientsInput from "./EmailRecipientsInput";

interface Props {
  onSuccess: () => void;
}

export default function ReminderForm({ onSuccess }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [remindAt, setRemindAt] = useState("");
  const [documentId, setDocumentId] = useState("");
  const [recipients, setRecipients] = useState<string[]>([]);
  const [documents, setDocuments] = useState<DocumentDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Ref để auto-add email đang gõ dở trong EmailRecipientsInput khi submit
  const recipientsFlushRef = useRef<(() => string[]) | null>(null);

  useEffect(() => {
    documentApi
      .list({ scope: "mine", limit: 20 })
      .then((res) => setDocuments(res.items))
      .catch(() => {});
  }, []);

  const nowIso = (() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  })();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !remindAt) return;
    setLoading(true);
    setError("");
    try {
      const remind_at = `${remindAt}:00+07:00`;

      // Auto-add email đang gõ dở trước khi submit
      // flush() trả về list cuối cùng (bao gồm cả email đang gõ nếu hợp lệ)
      const finalRecipients = recipientsFlushRef.current?.() ?? recipients;

      const payload: ReminderCreate = {
        title: title.trim(),
        remind_at,
        recipients: finalRecipients,
      };
      if (description.trim()) payload.description = description.trim();
      if (documentId) payload.document_id = documentId;

      await remindersApi.createReminder(payload);
      setTitle("");
      setDescription("");
      setRemindAt("");
      setDocumentId("");
      setRecipients([]);
      onSuccess();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || "Có lỗi xảy ra, vui lòng thử lại.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="r-title">Tiêu đề *</Label>
        <Input
          id="r-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ví dụ: Nộp báo cáo quý I"
          required
        />
      </div>

      <div>
        <Label htmlFor="r-desc">Ghi chú</Label>
        <Textarea
          id="r-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Ghi chú thêm..."
          rows={3}
        />
      </div>

      <div>
        <Label htmlFor="r-time">Thời gian nhắc *</Label>
        <Input
          id="r-time"
          type="datetime-local"
          value={remindAt}
          onChange={(e) => setRemindAt(e.target.value)}
          min={nowIso}
          required
        />
        <p className="mt-1 text-xs text-muted-foreground">Giờ Việt Nam (GMT+7)</p>
      </div>

      <div>
        <Label>Gửi nhắc đến</Label>
        <EmailRecipientsInput
          value={recipients}
          onChange={setRecipients}
          onFlushRef={recipientsFlushRef}
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Nhập email hoặc tìm người dùng trong hệ thống, nhấn Enter để thêm
        </p>
      </div>

      <div>
        <Label htmlFor="r-doc">Gắn tài liệu (tuỳ chọn)</Label>
        <select
          id="r-doc"
          value={documentId}
          onChange={(e) => setDocumentId(e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <option value="">— Không gắn tài liệu —</option>
          {documents.map((d) => (
            <option key={d.id} value={d.id}>
              {d.title}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Đang gửi..." : "Gửi lịch hẹn"}
      </Button>
    </form>
  );
}
