"use client";

import { useCallback, useRef, useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { documentApi } from "@/lib/api";
import { useAutosave } from "@/hooks/use-autosave";
import { Nd30Document } from "./nd30-document";
import { DocumentPreviewPaged } from "./DocumentPreviewPaged";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Save, Check, AlertCircle, Loader2, Eye, Download } from "lucide-react";
import type { Nd30Data } from "@/lib/nd30";
import { defaultNd30Data } from "@/lib/nd30";

interface DocumentEditorProps {
  documentId?: string;
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

function parseContent(content?: string): Partial<Nd30Data> {
  if (!content) return {};
  try {
    const parsed = JSON.parse(content);
    if (parsed.version === "nd30") return parsed as Nd30Data;
    if (typeof parsed.section_c === "string") return { noiDung: parsed.section_c, canCu: parsed.section_b ?? "" };
  } catch {
    return { noiDung: content };
  }
  return {};
}

export function DocumentEditor({ documentId, initialContent, initialTitle }: DocumentEditorProps) {
  const queryClient  = useQueryClient();
  const { toast }    = useToast();
  const [docId, setDocId] = useState(documentId);
  const isNew = !documentId;
  const dataRef = useRef<Nd30Data>(
    { ...defaultNd30Data(), ...parseContent(initialContent) }
  );

  // ── Preview mode ──────────────────────────────────────────────────────────
  const [previewMode, setPreviewMode] = useState(false);
  const [previewData, setPreviewData] = useState<Nd30Data | null>(null);

  const enterPreview = useCallback(() => {
    setPreviewData({ ...dataRef.current });
    setPreviewMode(true);
  }, []);

  const exitPreview = useCallback(() => {
    setPreviewMode(false);
    setPreviewData(null);
  }, []);

  // ── PDF export ────────────────────────────────────────────────────────────
  const [exporting, setExporting] = useState(false);

  const handleExportPdf = useCallback(async () => {
    if (!docId) {
      toast({ title: "Lưu văn bản trước khi xuất PDF", variant: "destructive" });
      return;
    }
    setExporting(true);
    try {
      const res = await fetch("/api/export/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ docId }),
      });
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      const d    = dataRef.current;
      const raw  = [d.soKyHieu, d.trichYeu || "vanban"].filter(Boolean).join("_");
      a.download = raw.replace(/[/\\:*?"<>|]/g, "-").substring(0, 120) + ".pdf";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: "Xuất PDF thành công" });
    } catch {
      toast({ title: "Xuất PDF thất bại", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  }, [docId, toast]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === "P") {
        e.preventDefault();
        setPreviewMode((prev) => {
          if (!prev) setPreviewData({ ...dataRef.current });
          else setPreviewData(null);
          return !prev;
        });
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const saveMutation = useMutation({
    mutationFn: async (data: Nd30Data) => {
      const soNum = parseInt(data.soKyHieu.split("/")[0]) || undefined;
      const payload = {
        title: data.trichYeu || data.coQuanBanHanh || "Tài liệu không tiêu đề",
        content: JSON.stringify({ version: "nd30", ...data }),
        loai_vb: data.loaiVanBan || undefined,
        so_van_ban: soNum,
        nam: soNum ? new Date().getFullYear() : undefined,
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
    onError: () => {
      toast({ title: "Lưu thất bại", variant: "destructive" });
    },
  });

  const { status, statusLabel, saveNow, markDirty } = useAutosave({
    onSave: async () => { await saveMutation.mutateAsync(dataRef.current); },
    interval: 30_000,
    enabled: true,
  });

  const handleChange = useCallback((data: Nd30Data) => {
    dataRef.current = data;
    markDirty();
  }, [markDirty]);

  if (previewMode && previewData) {
    return (
      <DocumentPreviewPaged
        data={previewData}
        onClose={exitPreview}
        onExportPdf={handleExportPdf}
        exporting={exporting}
      />
    );
  }

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
            variant="outline"
            size="sm"
            onClick={enterPreview}
            title="Xem trước (Ctrl+Shift+P)"
          >
            <Eye className="h-3.5 w-3.5 mr-1.5" />
            Xem trước
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPdf}
            disabled={exporting || !docId}
            title={!docId ? "Lưu văn bản trước" : "Xuất PDF"}
          >
            {exporting
              ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
              : <Download className="h-3.5 w-3.5 mr-1.5" />}
            Xuất PDF
          </Button>
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
          isNew={isNew}
        />
      </div>
    </div>
  );
}
