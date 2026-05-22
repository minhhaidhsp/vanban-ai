"use client";

import { useCallback, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { documentApi } from "@/lib/api";
import { useAutosave } from "@/hooks/use-autosave";
import { Nd30Document } from "./nd30-document";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Save, Check, AlertCircle, Loader2 } from "lucide-react";
import type { Nd30Data } from "@/lib/nd30";
import { defaultNd30Data } from "@/lib/nd30";

interface DocumentEditorProps {
  documentId?: string;
  /** JSON-parsed nội dung từ DB, hoặc plain text cũ */
  initialContent?: string;
  initialTitle?: string;
}

function SaveIndicator({ status, label }: { status: string; label: string }) {
  if (!label) return null;
  return (
    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
      {status === "saving" && <Loader2 className="h-3 w-3 animate-spin" />}
      {status === "saved"  && <Check   className="h-3 w-3 text-green-500" />}
      {status === "error"  && <AlertCircle className="h-3 w-3 text-destructive" />}
      {label}
    </span>
  );
}

/** Deserialize content từ DB thành Nd30Data */
function parseContent(content?: string): Partial<Nd30Data> {
  if (!content) return {};
  try {
    const parsed = JSON.parse(content);
    if (parsed.version === "nd30") return parsed as Nd30Data;
    // fallback: nội dung cũ (HTML text) → đưa vào noiDung
    if (typeof parsed.section_c === "string") return { noiDung: parsed.section_c, canCu: parsed.section_b ?? "" };
  } catch {
    // plain text
    return { noiDung: content };
  }
  return {};
}

export function DocumentEditor({ documentId, initialContent, initialTitle }: DocumentEditorProps) {
  const queryClient  = useQueryClient();
  const { toast }    = useToast();
  const [docId, setDocId] = useState(documentId);
  const dataRef      = useRef<Nd30Data>(
    { ...defaultNd30Data(), ...parseContent(initialContent) }
  );

  const saveMutation = useMutation({
    mutationFn: async (data: Nd30Data) => {
      const payload = {
        title: data.trichYeu || data.coQuanBanHanh || "Tài liệu không tiêu đề",
        content: JSON.stringify({ version: "nd30", ...data }),
      };
      if (docId) {
        return documentApi.update(docId, payload);
      } else {
        const created = await documentApi.create(payload);
        setDocId(created.id);
        queryClient.invalidateQueries({ queryKey: ["documents"] });
        return created;
      }
    },
    onSuccess: () => {
      toast({ title: "Đã lưu văn bản" });
    },
    onError: () => {
      toast({ title: "Lưu thất bại", variant: "destructive" });
    },
  });

  const handleSave = useCallback(async (data: Nd30Data) => {
    await saveMutation.mutateAsync(data);
  }, [saveMutation]);

  const { status, statusLabel, saveNow } = useAutosave({
    data: dataRef.current,
    onSave: handleSave,
    interval: 30_000,
    enabled: true,
  });

  const handleChange = useCallback((data: Nd30Data) => {
    dataRef.current = data;
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Save bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-card print:hidden">
        <span className="text-sm font-medium text-muted-foreground">
          {docId ? "Chỉnh sửa văn bản" : "Văn bản mới"}
        </span>
        <div className="flex items-center gap-3">
          <SaveIndicator status={status} label={statusLabel} />
          <Button
            size="sm"
            onClick={() => saveNow()}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <Save className="h-3.5 w-3.5" />}
            Lưu
          </Button>
        </div>
      </div>

      {/* A4 document */}
      <div className="flex-1 min-h-0">
        <Nd30Document
          initialData={{ ...defaultNd30Data(), ...parseContent(initialContent) }}
          onChange={handleChange}
        />
      </div>
    </div>
  );
}
