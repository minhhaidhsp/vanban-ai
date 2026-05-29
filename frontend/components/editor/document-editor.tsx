"use client";

import { useCallback, useRef, useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { documentApi } from "@/lib/api";
import { useAutosave } from "@/hooks/use-autosave";
import { Nd30Document } from "./nd30-document";
import { DocumentPreviewPaged } from "./DocumentPreviewPaged";
import { SourcesPanel } from "./SourcesPanel";
import { RightPanel } from "./RightPanel";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Save, Check, AlertCircle, Loader2, Eye, Download,
  PanelLeft, PanelRight,
} from "lucide-react";
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
  const queryClient = useQueryClient();
  const { toast }   = useToast();
  const [docId, setDocId] = useState(documentId);
  const isNew = !documentId;
  const dataRef = useRef<Nd30Data>(
    { ...defaultNd30Data(), ...parseContent(initialContent) }
  );

  // Source IDs for RAG scoping
  const [sourceIds, setSourceIds] = useState<string[]>([]);

  // Mobile panel toggles
  const [showLeft,  setShowLeft]  = useState(false);
  const [showRight, setShowRight] = useState(false);

  // Preview mode
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

  // PDF export
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

  // Keyboard shortcut: Ctrl+Shift+P = preview
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === "P") {
        e.preventDefault();
        setPreviewMode((prev) => {
          if (!prev) setPreviewData({ ...dataRef.current });
          else setPreviewData(null);
          return !prev;
        });
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Autosave
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

  const getDocContext = useCallback(() => {
    const d = dataRef.current;
    const strip = (html: string) =>
      (html || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    return [
      d.loaiVanBan && `Loại: ${d.loaiVanBan}`,
      d.soKyHieu   && `Số ký hiệu: ${d.soKyHieu}`,
      d.trichYeu   && `Trích yếu: ${d.trichYeu}`,
      d.canCu      && `Căn cứ: ${strip(d.canCu).slice(0, 300)}`,
      d.noiDung    && `Nội dung: ${strip(d.noiDung).slice(0, 500)}`,
    ].filter(Boolean).join("\n");
  }, []);

  const handleInsertText = useCallback(
    (text: string) => {
      navigator.clipboard.writeText(text).then(() => {
        toast({ title: "Đã copy", description: "Ctrl+V để dán vào văn bản" });
      }).catch(() => {
        toast({ title: "Không thể copy", variant: "destructive" });
      });
    },
    [toast]
  );

  // ── Preview mode ───────────────────────────────────────────────────────────
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

  // ── 3-column layout ────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full">
      {/* ── Save bar (full width) ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-card shrink-0 print:hidden h-14">
        <div className="flex items-center gap-2">
          {/* Mobile toggles */}
          <button
            onClick={() => { setShowLeft((v) => !v); setShowRight(false); }}
            className="lg:hidden p-1.5 rounded-md hover:bg-gray-100 text-gray-500"
            title="Tài liệu tham chiếu"
          >
            <PanelLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-medium text-muted-foreground">
            {docId ? "Chỉnh sửa văn bản" : "Văn bản mới"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <SaveIndicator status={status} label={statusLabel} />
          <Button variant="outline" size="sm" onClick={enterPreview} title="Xem trước (Ctrl+Shift+P)">
            <Eye className="h-3.5 w-3.5 mr-1.5" />
            Xem trước
          </Button>
          <Button
            variant="outline" size="sm"
            onClick={handleExportPdf}
            disabled={exporting || !docId}
            title={!docId ? "Lưu trước" : "Xuất PDF"}
          >
            {exporting
              ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
              : <Download className="h-3.5 w-3.5 mr-1.5" />}
            PDF
          </Button>
          <Button
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => saveNow()}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <Save className="h-3.5 w-3.5" />}
            Lưu
          </Button>
          <button
            onClick={() => { setShowRight((v) => !v); setShowLeft(false); }}
            className="lg:hidden p-1.5 rounded-md hover:bg-gray-100 text-gray-500"
            title="Công cụ AI"
          >
            <PanelRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── 3 columns ─────────────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* Left: Sources panel — hidden on mobile unless toggled */}
        <div className={`
          w-64 shrink-0 overflow-hidden
          lg:flex lg:flex-col
          ${showLeft ? "flex flex-col" : "hidden"}
          lg:!flex
        `}>
          <SourcesPanel
            documentId={docId || "new-doc"}
            onSourcesChange={setSourceIds}
          />
        </div>

        {/* Middle: Editor */}
        <div className="flex-1 min-w-0 overflow-hidden">
          <Nd30Document
            initialData={{ ...defaultNd30Data(), ...parseContent(initialContent) }}
            onChange={handleChange}
            isNew={isNew}
          />
        </div>

        {/* Right: Tools + Chat — hidden on mobile unless toggled */}
        <div className={`
          w-80 shrink-0 overflow-hidden
          lg:flex lg:flex-col
          ${showRight ? "flex flex-col" : "hidden"}
          lg:!flex
        `}>
          <RightPanel
            docId={docId || "new-doc"}
            getDocContext={getDocContext}
            onInsertText={handleInsertText}
            sourceIds={sourceIds}
          />
        </div>

      </div>
    </div>
  );
}
