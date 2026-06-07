"use client";

import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { documentApi } from "@/lib/api";
import type { ReviewChange, ReviewResult } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Check, Copy, Loader2, Sparkles, Upload, X } from "lucide-react";
import dynamic from "next/dynamic";

const DocumentEditor = dynamic(
  () => import("@/components/editor/document-editor").then((m) => m.DocumentEditor),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
        Đang tải...
      </div>
    ),
  }
);

// ── Badge helpers ─────────────────────────────────────────────────────────────

const BADGE_COLOR: Record<string, string> = {
  chinh_ta: "bg-red-100 text-red-700",
  the_thuc: "bg-purple-100 text-purple-700",
  van_phong: "bg-blue-100 text-blue-700",
  dau_cau: "bg-yellow-100 text-yellow-700",
  thuat_ngu: "bg-green-100 text-green-700",
};

const BADGE_LABEL: Record<string, string> = {
  chinh_ta: "Chính tả",
  the_thuc: "Thể thức",
  van_phong: "Văn phong",
  dau_cau: "Dấu câu",
  thuat_ngu: "Thuật ngữ",
};

const MAX_FILE_BYTES = 50 * 1024 * 1024; // 50 MB

// ── Page ──────────────────────────────────────────────────────────────────────

export default function EditDocumentPage({ params }: { params: { id: string } }) {
  const { toast } = useToast();

  const { data: doc, isLoading } = useQuery({
    queryKey: ["document", params.id],
    queryFn: () => documentApi.get(params.id),
  });

  // ── AI Review state ───────────────────────────────────────────────────────
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewResult, setReviewResult] = useState<ReviewResult | null>(null);
  const [showReview, setShowReview] = useState(false);
  const [reviewTab, setReviewTab] = useState<"text" | "changes">("text");
  const [copied, setCopied] = useState(false);

  const handleReview = async () => {
    setIsReviewing(true);
    try {
      const data = await documentApi.review(params.id);
      setReviewResult(data);
      setShowReview(true);
      setReviewTab("text");
    } catch {
      toast({
        title: "Lỗi AI Review",
        description: "Không thể kết nối LLM. Vui lòng thử lại.",
        variant: "destructive",
      });
    } finally {
      setIsReviewing(false);
    }
  };

  const handleCopyReview = async () => {
    if (!reviewResult) return;
    await navigator.clipboard.writeText(reviewResult.reviewed_text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApplyToEditor = async () => {
    if (!reviewResult) return;
    await navigator.clipboard.writeText(reviewResult.reviewed_text);
    toast({ title: "Đã copy vào clipboard", description: "Ctrl+V để dán vào văn bản." });
  };

  // ── Import state ──────────────────────────────────────────────────────────
  const [showImport, setShowImport] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Forces DocumentEditor remount with overridden content after import
  const [editorKey, setEditorKey] = useState(0);
  const [overrideContent, setOverrideContent] = useState<string | undefined>(undefined);

  const handleImportFileSelect = (f: File) => {
    if (f.size > MAX_FILE_BYTES) {
      toast({
        title: "File quá lớn",
        description: "Kích thước file không được vượt quá 50 MB.",
        variant: "destructive",
      });
      return;
    }
    setImportFile(f);
  };

  const handleImport = async () => {
    if (!importFile) return;
    setIsImporting(true);
    try {
      const res = await documentApi.uploadFile(params.id, importFile);
      const extractedText = res.extracted_text ?? "";

      if (!extractedText.trim()) {
        toast({
          title: "Không thể trích xuất nội dung",
          description: "File không có văn bản có thể đọc được (có thể là ảnh scan).",
          variant: "destructive",
        });
        return;
      }

      // Convert plain text → nd30 JSON with noiDung set to HTML paragraphs
      const paras = extractedText
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .map((l) => `<p>${l}</p>`)
        .join("");
      const nd30Json = JSON.stringify({ version: "nd30", noiDung: paras });
      setOverrideContent(nd30Json);
      setEditorKey((k) => k + 1); // remount editor with new content

      setShowImport(false);
      setImportFile(null);
      toast({ title: "Import thành công", description: `Đã nhập nội dung từ "${importFile.name}".` });

      // Auto-trigger AI Review so user sees suggestions right away
      handleReview();
    } catch {
      toast({
        title: "Import thất bại",
        description: "Không thể xử lý file. Vui lòng thử lại.",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
        Đang tải...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full relative">

      {/* Thin action bar */}
      <div className="flex items-center justify-end gap-1.5 px-4 py-1.5 border-b bg-muted/20 shrink-0">
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground hover:bg-muted"
          onClick={() => { setImportFile(null); setShowImport(true); }}
        >
          <Upload className="h-3.5 w-3.5" />
          Import từ file
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs gap-1.5 text-violet-700 hover:text-violet-800 hover:bg-violet-50"
          onClick={handleReview}
          disabled={isReviewing}
        >
          {isReviewing
            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
            : <Sparkles className="h-3.5 w-3.5" />}
          {isReviewing ? "Đang rà soát..." : "AI Review"}
        </Button>
      </div>

      <div className="flex-1 min-h-0 flex flex-col">
        <DocumentEditor
          key={editorKey}
          documentId={params.id}
          initialContent={overrideContent ?? doc?.content}
          initialTitle={doc?.title}
        />
      </div>

      {/* ── Import Modal ──────────────────────────────────────────────────── */}
      {showImport && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-50"
            onClick={() => !isImporting && setShowImport(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div
              className="bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3 border-b shrink-0">
                <div className="flex items-center gap-2">
                  <Upload className="h-4 w-4 text-blue-600" />
                  <span className="font-semibold text-sm">Import văn bản từ file</span>
                </div>
                <button
                  onClick={() => !isImporting && setShowImport(false)}
                  className="text-muted-foreground hover:text-foreground p-1 rounded transition-colors"
                  aria-label="Đóng"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Dropzone */}
              <div className="p-5 space-y-4">
                <div
                  className={[
                    "border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer",
                    isDragging
                      ? "border-blue-400 bg-blue-50"
                      : importFile
                        ? "border-green-400 bg-green-50"
                        : "border-muted-foreground/25 hover:border-blue-300 hover:bg-muted/30",
                  ].join(" ")}
                  onClick={() => !isImporting && fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    const f = e.dataTransfer.files[0];
                    if (f) handleImportFileSelect(f);
                  }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".docx,.pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleImportFileSelect(f);
                      e.target.value = "";
                    }}
                  />
                  {importFile ? (
                    <div className="flex flex-col items-center gap-2">
                      <Check className="h-8 w-8 text-green-500" />
                      <p className="text-sm font-medium text-green-700">{importFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(importFile.size / 1024).toFixed(0)} KB — click để đổi file
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Upload className="h-8 w-8 text-muted-foreground/50" />
                      <p className="text-sm font-medium">Kéo file vào đây hoặc click để chọn</p>
                      <p className="text-xs text-muted-foreground">Hỗ trợ: .docx, .pdf — tối đa 50 MB</p>
                    </div>
                  )}
                </div>

                <p className="text-xs text-muted-foreground">
                  Nội dung file sẽ được trích xuất và đưa vào editor. Sau khi import, AI Review sẽ tự động chạy để gợi ý chỉnh sửa.
                </p>
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-2 px-5 py-3 border-t shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowImport(false)}
                  disabled={isImporting}
                >
                  Hủy
                </Button>
                <Button
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
                  onClick={handleImport}
                  disabled={!importFile || isImporting}
                >
                  {isImporting
                    ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Đang xử lý...</>
                    : <><Upload className="h-3.5 w-3.5" />Import</>}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Review Modal ─────────────────────────────────────────────────── */}
      {showReview && reviewResult && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-50"
            onClick={() => setShowReview(false)}
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div
              className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3 border-b shrink-0">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-violet-600" />
                  <span className="font-semibold text-sm">AI Review văn bản</span>
                </div>
                <button
                  onClick={() => setShowReview(false)}
                  className="text-muted-foreground hover:text-foreground p-1 rounded transition-colors"
                  aria-label="Đóng"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Summary */}
              {reviewResult.summary && (
                <div className="mx-5 mt-3 p-3 bg-green-50 rounded-lg border border-green-200 shrink-0">
                  <p className="text-[10px] font-semibold uppercase text-green-700 mb-1">Tóm tắt</p>
                  <p className="text-sm text-green-800">{reviewResult.summary}</p>
                </div>
              )}

              {/* Tabs */}
              <div className="flex border-b mt-3 px-5 shrink-0">
                {(["text", "changes"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setReviewTab(tab)}
                    className={[
                      "px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
                      reviewTab === tab
                        ? "border-violet-600 text-violet-700"
                        : "border-transparent text-muted-foreground hover:text-foreground",
                    ].join(" ")}
                  >
                    {tab === "text"
                      ? "Văn bản đã chỉnh"
                      : `Thay đổi (${reviewResult.changes.length})`}
                  </button>
                ))}
              </div>

              {/* Content */}
              <div className="flex-1 min-h-0 overflow-y-auto p-5">

                {reviewTab === "text" && (
                  <div className="flex flex-col gap-3 h-full">
                    <textarea
                      readOnly
                      value={reviewResult.reviewed_text}
                      className="flex-1 min-h-[280px] font-mono text-xs resize-none border rounded-lg p-3 bg-muted/30"
                    />
                    <div className="flex gap-2 shrink-0">
                      <Button size="sm" variant="outline" className="gap-1.5" onClick={handleCopyReview}>
                        {copied
                          ? <Check className="h-3.5 w-3.5 text-green-600" />
                          : <Copy className="h-3.5 w-3.5" />}
                        {copied ? "Đã copy" : "Copy"}
                      </Button>
                      <Button size="sm" variant="outline" className="gap-1.5" onClick={handleApplyToEditor}>
                        <Sparkles className="h-3.5 w-3.5" />
                        Áp dụng vào editor
                      </Button>
                    </div>
                  </div>
                )}

                {reviewTab === "changes" && (
                  <div className="space-y-3">
                    {reviewResult.changes.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        Không có thay đổi nào
                      </p>
                    )}
                    {reviewResult.changes.map((change: ReviewChange, i: number) => (
                      <div key={i} className="border rounded-lg p-3 space-y-2 text-xs">
                        <span
                          className={[
                            "inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded",
                            BADGE_COLOR[change.type] ?? "bg-gray-100 text-gray-700",
                          ].join(" ")}
                        >
                          {BADGE_LABEL[change.type] ?? change.type}
                        </span>
                        <div className="space-y-1">
                          <div className="line-through text-red-600 bg-red-50 px-2 py-1 rounded leading-relaxed">
                            {change.original}
                          </div>
                          <div className="text-green-700 bg-green-50 px-2 py-1 rounded leading-relaxed">
                            {change.revised}
                          </div>
                        </div>
                        {change.reason && (
                          <p className="text-[11px] text-muted-foreground">{change.reason}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

              </div>

              {/* Footer */}
              <div className="flex justify-end px-5 py-3 border-t shrink-0">
                <Button variant="outline" size="sm" onClick={() => setShowReview(false)}>
                  Đóng
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

    </div>
  );
}
