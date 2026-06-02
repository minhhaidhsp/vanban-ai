"use client";

import { useCallback, useRef, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { documentApi } from "@/lib/api";
import { useAutosave } from "@/hooks/use-autosave";
import { Nd30Document } from "./nd30-document";
import { DocumentPreviewPaged } from "./DocumentPreviewPaged";
import { SourcesPanel } from "./SourcesPanel";
import { RightPanel } from "./RightPanel";
import { ResizeHandle } from "./ResizeHandle";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Save, Check, AlertCircle, Loader2, Eye, Download, ChevronDown,
  PanelLeft, PanelRight, ArrowLeft, ArrowRight, X,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Nd30Data } from "@/lib/nd30";
import { defaultNd30Data } from "@/lib/nd30";

// ── Welcome panel constants ────────────────────────────────────────────────────

const LOAI_OPTIONS = [
  { abbr: "QĐ",  label: "Quyết định", emoji: "📋" },
  { abbr: "CV",  label: "Công văn",   emoji: "📨" },
  { abbr: "BC",  label: "Báo cáo",    emoji: "📊" },
  { abbr: "HD",  label: "Hướng dẫn",  emoji: "📝" },
  { abbr: "TTr", label: "Tờ trình",   emoji: "📑" },
  { abbr: "TB",  label: "Thông báo",  emoji: "📃" },
];

// ── WelcomePanel ──────────────────────────────────────────────────────────────

interface WelcomePanelProps {
  yeuCau: string;
  onYeuCauChange: (v: string) => void;
  loaiSelected: string;
  onLoaiSelect: (abbr: string, label: string) => void;
  onGenerate: () => void;
  onSkip: () => void;
  generating: boolean;
  canGenerate: boolean;
}

function WelcomePanel({
  yeuCau, onYeuCauChange, loaiSelected, onLoaiSelect,
  onGenerate, onSkip, generating, canGenerate,
}: WelcomePanelProps) {
  return (
    <div className="h-full overflow-y-auto bg-[#e5e7eb] py-6">
      <div
        className="mx-auto bg-white shadow-lg"
        style={{ width: "210mm", minHeight: "297mm", padding: "25mm 20mm 25mm 30mm", boxSizing: "border-box" }}
      >
        {generating ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
            <p className="text-lg font-medium text-gray-700">AI đang soạn thảo...</p>
            <p className="text-sm text-gray-400">Thường mất 15–30 giây</p>
          </div>
        ) : (
          <div className="space-y-6 max-w-md mx-auto">
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Mô tả văn bản cần tạo</p>
              <textarea
                value={yeuCau}
                onChange={(e) => onYeuCauChange(e.target.value)}
                placeholder={"Mô tả văn bản bạn muốn tạo...\nVí dụ: Quyết định phê duyệt danh sách học sinh xuất sắc năm học 2025-2026"}
                className="w-full h-32 resize-none border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>

            <div>
              <p className="text-xs text-gray-500 mb-2 font-medium">Loại văn bản</p>
              <div className="grid grid-cols-3 gap-2">
                {LOAI_OPTIONS.map((o) => (
                  <button
                    key={o.abbr}
                    type="button"
                    onClick={() => onLoaiSelect(o.abbr, o.label)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-colors",
                      loaiSelected === o.abbr
                        ? "border-blue-600 bg-blue-50 text-blue-700"
                        : "border-gray-200 hover:border-blue-300 text-gray-700"
                    )}
                  >
                    <span>{o.emoji}</span> {o.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white w-full"
                disabled={!canGenerate}
                onClick={onGenerate}
              >
                Tạo văn bản <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
              <Button
                variant="outline"
                className="w-full text-gray-500 border-gray-200"
                onClick={onSkip}
              >
                Bỏ qua → vào editor trống
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── DocumentEditor ────────────────────────────────────────────────────────────

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

function isAiGenerated(content?: string): boolean {
  if (!content) return false;
  try { return JSON.parse(content)?.ai_generated === true; } catch { return false; }
}

export function DocumentEditor({ documentId, initialContent, initialTitle }: DocumentEditorProps) {
  const queryClient = useQueryClient();
  const { toast }   = useToast();
  const router      = useRouter();
  const [docId, setDocId] = useState(documentId);
  const isNew = !documentId;
  const [showAiBanner, setShowAiBanner] = useState(() => isAiGenerated(initialContent));
  const [documentTitle, setDocumentTitle] = useState(initialTitle || "Văn bản mới");
  const [editingTitle, setEditingTitle] = useState(false);

  // Welcome panel state (shown when navigated from modal with ?new=true)
  const wasNewDoc = useRef(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [generatingAi, setGeneratingAi] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<Partial<Nd30Data> | null>(null);
  const [yeuCau, setYeuCau] = useState("");
  const [loaiSelected, setLoaiSelected] = useState("");
  const searchParams = useSearchParams();
  const dataRef = useRef<Nd30Data>(
    { ...defaultNd30Data(), ...parseContent(initialContent) }
  );

  // Source IDs for RAG scoping
  const [sourceIds, setSourceIds] = useState<string[]>([]);

  const handleSourcesChange = useCallback((ids: string[]) => {
    setSourceIds((prev) =>
      prev.length === ids.length && prev.every((id, i) => id === ids[i]) ? prev : ids
    );
  }, []);

  // Mobile panel toggles
  const [showLeft,  setShowLeft]  = useState(false);
  const [showRight, setShowRight] = useState(false);

  // Resizable column widths (px)
  const MIN_WIDTH = 180;
  const MAX_LEFT  = 480;
  const MAX_RIGHT = 560;
  const [leftWidth,  setLeftWidth]  = useState(300);
  const [rightWidth, setRightWidth] = useState(380);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("editor-col-widths");
      if (saved) {
        const { left, right } = JSON.parse(saved);
        if (left)  setLeftWidth(left);
        if (right) setRightWidth(right);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem("editor-col-widths", JSON.stringify({ left: leftWidth, right: rightWidth }));
    }, 500);
    return () => clearTimeout(timer);
  }, [leftWidth, rightWidth]);

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

  const handleExportDocx = useCallback(async () => {
    if (!docId) {
      toast({ title: "Lưu văn bản trước khi xuất DOCX", variant: "destructive" });
      return;
    }
    setExporting(true);
    try {
      const blob = await documentApi.exportDocx(docId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const d = dataRef.current;
      const raw = [d.soKyHieu, d.trichYeu || "vanban"].filter(Boolean).join("_");
      a.download = raw.replace(/[/\\:*?"<>|]/g, "-").substring(0, 120) + ".docx";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: "Xuất DOCX thành công" });
    } catch {
      toast({ title: "Xuất DOCX thất bại", variant: "destructive" });
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

  // ?new=true → show welcome panel, clear URL param
  useEffect(() => {
    const isNewDoc = searchParams.get("new") === "true";
    if (isNewDoc) {
      wasNewDoc.current = true;
      setShowWelcome(true);
      if (documentId) router.replace(`/dashboard/documents/${documentId}`);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleGenerate = useCallback(async () => {
    if (!docId || !yeuCau.trim()) return;
    setGeneratingAi(true);
    try {
      await documentApi.generate({
        document_id: docId,
        loai_van_ban: loaiSelected || "Quyết định",
        yeu_cau: yeuCau,
        source_ids: sourceIds,
      });
      const updated = await documentApi.get(docId);
      const parsedContent = parseContent(updated.content);
      dataRef.current = { ...defaultNd30Data(), ...parsedContent };
      setGeneratedContent(parsedContent);
      setShowAiBanner(true);
      setShowWelcome(false);
    } catch {
      toast({ title: "Tạo văn bản thất bại", variant: "destructive" });
    } finally {
      setGeneratingAi(false);
    }
  }, [docId, loaiSelected, yeuCau, sourceIds, toast]);

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
        onExportDocx={handleExportDocx}
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
          {/* Back button */}
          <button
            onClick={() => router.push("/dashboard/documents")}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-colors"
            title="Quay lại danh sách"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          {/* Mobile toggle: sources */}
          <button
            onClick={() => { setShowLeft((v) => !v); setShowRight(false); }}
            className="lg:hidden p-1.5 rounded-md hover:bg-gray-100 text-gray-500"
            title="Tài liệu tham chiếu"
          >
            <PanelLeft className="h-4 w-4" />
          </button>
          {!editingTitle ? (
            <button
              onClick={() => setEditingTitle(true)}
              className="text-sm font-medium text-gray-700 hover:text-gray-900
                         truncate max-w-[250px] text-left hover:underline
                         decoration-dashed underline-offset-2"
              title={documentTitle}
            >
              {documentTitle}
            </button>
          ) : (
            <input
              autoFocus
              value={documentTitle}
              onChange={(e) => setDocumentTitle(e.target.value)}
              onBlur={() => {
                setEditingTitle(false);
                if (docId) documentApi.update(docId, { title: documentTitle });
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === "Escape") {
                  setEditingTitle(false);
                  if (docId) documentApi.update(docId, { title: documentTitle });
                }
              }}
              className="text-sm font-medium border-b border-gray-400
                         outline-none bg-transparent w-[250px]"
            />
          )}
        </div>

        <div className="flex items-center gap-2">
          <SaveIndicator status={status} label={statusLabel} />
          <Button variant="outline" size="sm" onClick={enterPreview} title="Xem trước (Ctrl+Shift+P)">
            <Eye className="h-3.5 w-3.5 mr-1.5" />
            Xem trước
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline" size="sm"
                disabled={exporting || !docId}
                title={!docId ? "Lưu trước" : "Tải xuống"}
              >
                {exporting
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  : <Download className="h-3.5 w-3.5 mr-1.5" />}
                Tải xuống
                <ChevronDown className="h-3 w-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportDocx} disabled={!docId}>
                Tải DOCX
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportPdf} disabled={!docId}>
                Tải PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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

      {/* ── AI-generated banner ───────────────────────────────────────────── */}
      {showAiBanner && (
        <div className="flex items-center justify-between bg-amber-50 border-b border-amber-200 text-amber-800 text-sm px-4 py-2 shrink-0 print:hidden">
          <span>✨ AI đã tạo mẫu — hãy xem lại và chỉnh sửa trước khi ban hành</span>
          <button
            onClick={() => setShowAiBanner(false)}
            className="ml-3 text-amber-600 hover:text-amber-900 transition-colors p-0.5 rounded"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── 3 columns (resizable) ─────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* Left: Sources panel */}
        <div
          className={`shrink-0 overflow-hidden lg:flex lg:flex-col ${showLeft ? "flex flex-col" : "hidden"} lg:!flex`}
          style={{ width: leftWidth, minWidth: MIN_WIDTH }}
        >
          <SourcesPanel
            documentId={docId || "new-doc"}
            onSourcesChange={handleSourcesChange}
          />
        </div>

        {/* Resize handle — left */}
        <div className="hidden lg:block h-full">
          <ResizeHandle
            direction="right"
            onResize={(d) => setLeftWidth((w) => Math.min(MAX_LEFT, Math.max(MIN_WIDTH, w + d)))}
          />
        </div>

        {/* Middle: WelcomePanel or Editor */}
        <div className="flex-1 min-w-0 overflow-y-auto">
          {showWelcome ? (
            <WelcomePanel
              yeuCau={yeuCau}
              onYeuCauChange={setYeuCau}
              loaiSelected={loaiSelected}
              onLoaiSelect={(abbr, label) => {
                setLoaiSelected(abbr);
                if (!yeuCau.trim()) setYeuCau(`Tạo ${label}: `);
              }}
              onGenerate={handleGenerate}
              onSkip={() => setShowWelcome(false)}
              generating={generatingAi}
              canGenerate={!!docId && yeuCau.trim().length > 0}
            />
          ) : (
            <Nd30Document
              key={generatedContent ? "generated" : "initial"}
              initialData={
                generatedContent
                  ? { ...defaultNd30Data(), ...generatedContent }
                  : { ...defaultNd30Data(), ...parseContent(initialContent) }
              }
              onChange={handleChange}
              isNew={!generatedContent && wasNewDoc.current}
            />
          )}
        </div>

        {/* Right: Tools + Chat — hidden during welcome */}
        {!showWelcome && (
          <>
            {/* Resize handle — right */}
            <div className="hidden lg:block h-full">
              <ResizeHandle
                direction="left"
                onResize={(d) => setRightWidth((w) => Math.min(MAX_RIGHT, Math.max(MIN_WIDTH, w + d)))}
              />
            </div>

            <div
              className={`shrink-0 overflow-hidden lg:flex lg:flex-col ${showRight ? "flex flex-col" : "hidden"} lg:!flex`}
              style={{ width: rightWidth, minWidth: MIN_WIDTH }}
            >
              <RightPanel
                docId={docId || "new-doc"}
                getDocContext={getDocContext}
                onInsertText={handleInsertText}
                sourceIds={sourceIds}
              />
            </div>
          </>
        )}

      </div>
    </div>
  );
}
