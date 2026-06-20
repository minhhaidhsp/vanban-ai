"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2, Calendar } from "lucide-react";
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
      const finalRecipients = recipientsFlushRef.current?.() ?? recipients;
      const payload: ReminderCreate = { title: title.trim(), remind_at, recipients: finalRecipients };
      if (description.trim()) payload.description = description.trim();
      if (documentId) payload.document_id = documentId;

      await remindersApi.createReminder(payload);
      setTitle(""); setDescription(""); setRemindAt("");
      setDocumentId(""); setRecipients([]);
      onSuccess();
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || "Có lỗi xảy ra, vui lòng thử lại."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="r-title" className="text-sm font-medium">Tiêu đề *</Label>
        <Input
          id="r-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ví dụ: Nộp báo cáo quý I"
          required
          className="focus-visible:ring-2 focus-visible:ring-primary/20"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="r-desc" className="text-sm font-medium">Ghi chú</Label>
        <Textarea
          id="r-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Ghi chú thêm..."
          rows={2}
          className="resize-none focus-visible:ring-2 focus-visible:ring-primary/20"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="r-time" className="text-sm font-medium">Thời gian nhắc *</Label>
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            id="r-time"
            type="datetime-local"
            value={remindAt}
            onChange={(e) => setRemindAt(e.target.value)}
            min={nowIso}
            required
            className="pl-9 focus-visible:ring-2 focus-visible:ring-primary/20"
          />
        </div>
        <p className="text-xs text-muted-foreground">Giờ Việt Nam (GMT+7)</p>
      </div>

      <div className="space-y-1.5">
        <Label className="text-sm font-medium">Gửi nhắc đến</Label>
        <EmailRecipientsInput value={recipients} onChange={setRecipients} onFlushRef={recipientsFlushRef} />
        <p className="text-xs text-muted-foreground">Nhấn Enter để thêm email</p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="r-doc" className="text-sm font-medium">Gắn tài liệu</Label>
        <select
          id="r-doc"
          value={documentId}
          onChange={(e) => setDocumentId(e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <option value="">— Không gắn tài liệu —</option>
          {documents.map((d) => (
            <option key={d.id} value={d.id}>{d.title}</option>
          ))}
        </select>
      </div>

      {error && <p className="rounded-md bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={loading} className="h-10 w-full">
        {loading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Send className="mr-2 h-4 w-4" />
        )}
        {loading ? "Đang gửi..." : "Gửi lịch hẹn"}
      </Button>
    </form>
  );
}
