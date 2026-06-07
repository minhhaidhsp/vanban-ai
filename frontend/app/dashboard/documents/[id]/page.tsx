"use client";

import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { documentApi } from "@/lib/api";
import type { ReviewChange } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Check, Loader2, ShieldCheck, Upload, X } from "lucide-react";
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

const SECTION_LABEL: Record<string, string> = {
  trichYeu: "Trích yếu",
  canCu: "Căn cứ",
  noiDung: "Nội dung",
  noiNhan: "Nơi nhận",
};

const MAX_FILE_BYTES = 50 * 1024 * 1024; // 50 MB

const ND30_SECTION_FIELDS = ["trichYeu", "canCu", "noiDung", "noiNhan"] as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

function hasText(content: unknown): boolean {
  try {
    const str = typeof content === "string" ? content : JSON.stringify(content);
    if (!str || str.trim().length === 0 || str === "{}") return false;
    const data = typeof content === "string" ? JSON.parse(content) : content;
    if (data?.noiDung) {
      const stripped = data.noiDung
        .replace(/<[^>]*>/g, "")
        .replace(/&nbsp;/g, " ")
        .trim();
      return stripped.length > 0;
    }
    if (data?.version === "nd30") {
      const fields = [data.noiDung, data.trichYeu, data.canCu];
      return fields.some(
        (f) => f && f.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim().length > 0
      );
    }
    if (data?.trichYeu) return data.trichYeu.trim().length > 0;
    if (data?.canCu) return data.canCu.replace(/<[^>]*>/g, "").trim().length > 0;
    if (data?.type === "doc") return JSON.stringify(data).length > 50;
    return str.trim().length > 10;
  } catch {
    return false;
  }
}

function applyChangeToContent(
  raw: string,
  change: ReviewChange
): string {
  try {
    const data = JSON.parse(raw) as Record<string, unknown>;
    const target =
      ND30_SECTION_FIELDS.includes(
        change.section as (typeof ND30_SECTION_FIELDS)[number]
      ) && change.section !== "general"
        ? (change.section as string)
        : null;

    let replaced = false;
    if (target && typeof data[target] === "string" && (data[target] as string).includes(change.original)) {
      data[target] = (data[target] as string).replace(change.original, change.revised);
      replaced = true;
    }
    if (!replaced) {
      for (const field of ND30_SECTION_FIELDS) {
        if (typeof data[field] === "string" && (data[field] as string).includes(change.original)) {
          data[field] = (data[field] as string).replace(change.original, change.revised);
          break;
        }
      }
    }
    return JSON.stringify(data);
  } catch {
    return raw;
  }
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function EditDocumentPage({ params }: { params: { id: string } }) {
  const { toast } = useToast();

  const { data: doc, isLoading } = useQuery({
    queryKey: ["document", params.id],
    queryFn: () => documentApi.get(params.id),
  });

  // Forces DocumentEditor remount with overridden content
  const [editorKey, setEditorKey] = useState(0);
  const [overrideContent, setOverrideContent] = useState<string | undefined>(undefined);
  // Sync ref so handleReview called right after setOverrideContent sees the new value
  const overrideContentRef = useRef<string | undefined>(undefined);

  const setContent = (c: string) => {
    overrideContentRef.current = c;
    setOverrideContent(c);
    setEditorKey((k) => k + 1);
  };

  // ── AI Review state ───────────────────────────────────────────────────────
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewChanges, setReviewChanges] = useState<ReviewChange[]>([]);
  const [reviewSummary, setReviewSummary] = useState("");
  const [showReviewPanel, setShowReviewPanel] = useState(false);
  const [acceptedIds, setAcceptedIds] = useState<Set<number>>(new Set());
  const [rejectedIds, setRejectedIds] = useState<Set<number>>(new Set());

  // checkContent: optional override for content-check (used after import before re-render)
  const handleReview = async (checkContent?: string) => {
    const content = checkContent ?? overrideContentRef.current ?? overrideContent ?? doc?.content;
    if (!content || !hasText(content)) {
      toast({
        title: "Chưa có nội dung",
        description: "Vui lòng nhập nội dung văn bản trước khi rà soát.",
        variant: "destructive",
      });
      return;
    }
    setIsReviewing(true);
    try {
      const data = await documentApi.review(params.id);
      setReviewChanges(data.changes);
      setReviewSummary(data.summary ?? "");
      setAcceptedIds(new Set());
      setRejectedIds(new Set());
      setShowReviewPanel(true);
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

  const applyChange = (i: number) => {
    const raw = overrideContentRef.current ?? overrideContent ?? doc?.content ?? "{}";
    const newContent = applyChangeToContent(raw, reviewChanges[i]);
    overrideContentRef.current = newContent;
    setOverrideContent(newContent);
    setEditorKey((k) => k + 1);
    setAcceptedIds((prev) => new Set([...prev, i]));
  };

  const rejectChange = (i: number) => {
    setRejectedIds((prev) => new Set([...prev, i]));
  };

  const applyAllPending = () => {
    let raw = overrideContentRef.current ?? overrideContent ?? doc?.content ?? "{}";
    const newAccepted = new Set(acceptedIds);
    reviewChanges.forEach((change, i) => {
      if (acceptedIds.has(i) || rejectedIds.has(i)) return;
      raw = applyChangeToContent(raw, change);
      newAccepted.add(i);
    });
    overrideContentRef.current = raw;
    setOverrideContent(raw);
    setEditorKey((k) => k + 1);
    setAcceptedIds(newAccepted);
  };

  const pendingCount = reviewChanges.filter((_, i) => !acceptedIds.has(i) && !rejectedIds.has(i)).length;

  // ── Import state ──────────────────────────────────────────────────────────
  const [showImport, setShowImport] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

      const paras = extractedText
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .map((l) => `<p>${l}</p>`)
        .join("");
      const nd30Json = JSON.stringify({ version: "nd30", noiDung: paras });

      // Update ref synchronously before calling handleReview
      overrideContentRef.current = nd30Json;
      setOverrideContent(nd30Json);
      setEditorKey((k) => k + 1);

      setShowImport(false);
      setImportFile(null);
      toast({ title: "Import thành công", description: `Đã nhập nội dung từ "${importFile.name}".` });

      // Auto-trigger AI Review; pass nd30Json so content check uses fresh content
      handleReview(nd30Json);
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

      {/* Thin action bar — Import only (AI Review moved to Tools tab) */}
      <div className="flex items-center justify-end px-4 py-1.5 border-b bg-muted/20 shrink-0">
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground hover:bg-muted"
          onClick={() => { setImportFile(null); setShowImport(true); }}
        >
          <Upload className="h-3.5 w-3.5" />
          Import từ file
        </Button>
      </div>

      <div className="flex-1 min-h-0 flex flex-col">
        <DocumentEditor
          key={editorKey}
          documentId={params.id}
          initialContent={overrideContent ?? doc?.content}
          initialTitle={doc?.title}
          onAiReview={handleReview}
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
                  Nội dung sẽ được trích xuất và đưa vào editor. AI Review tự động chạy sau khi import.
                </p>
              </div>

              <div className="flex justify-end gap-2 px-5 py-3 border-t shrink-0">
                <Button variant="outline" size="sm" onClick={() => setShowImport(false)} disabled={isImporting}>
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

      {/* ── Review Panel (slide-in drawer over right panel) ───────────────── */}
      <div
        className={[
          "fixed right-0 top-0 bottom-0 z-40 flex flex-col bg-white border-l shadow-2xl",
          "w-full sm:w-[400px] transition-transform duration-300",
          showReviewPanel ? "translate-x-0" : "translate-x-full",
        ].join(" ")}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-violet-50 shrink-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-violet-600" />
            <span className="font-semibold text-sm text-violet-900">Kết quả rà soát</span>
            <span className="text-[11px] bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded-full font-medium">
              {reviewChanges.length} thay đổi
            </span>
          </div>
          <button
            onClick={() => setShowReviewPanel(false)}
            className="text-muted-foreground hover:text-foreground p-1 rounded transition-colors"
            aria-label="Đóng"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Stats bar */}
        <div className="px-4 py-3 border-b shrink-0 space-y-2">
          {reviewChanges.length > 0 && (
            <>
              <div className="flex h-1.5 rounded-full overflow-hidden bg-gray-200">
                <div
                  className="bg-green-500 transition-all duration-300"
                  style={{ width: `${(acceptedIds.size / reviewChanges.length) * 100}%` }}
                />
                <div
                  className="bg-red-400 transition-all duration-300"
                  style={{ width: `${(rejectedIds.size / reviewChanges.length) * 100}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-green-600 font-medium">{acceptedIds.size} áp dụng</span>
                <span className="text-muted-foreground">{pendingCount} chờ xử lý</span>
                <span className="text-red-500 font-medium">{rejectedIds.size} bỏ qua</span>
              </div>
            </>
          )}
          {reviewSummary && (
            <p className="text-xs text-green-800 bg-green-50 border border-green-200 rounded-lg p-2 leading-relaxed">
              {reviewSummary}
            </p>
          )}
        </div>

        {/* Changes list */}
        <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2">
          {reviewChanges.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-10">
              Không tìm thấy thay đổi nào.
            </p>
          )}
          {reviewChanges.map((change, i) => {
            const accepted = acceptedIds.has(i);
            const rejected = rejectedIds.has(i);
            return (
              <div
                key={i}
                className={[
                  "border rounded-lg p-3 space-y-2 text-xs transition-opacity",
                  accepted || rejected ? "opacity-50" : "",
                  accepted ? "border-green-200 bg-green-50/30" : "",
                  rejected ? "border-red-200 bg-red-50/30" : "",
                ].join(" ")}
              >
                {/* Badges row */}
                <div className="flex items-center gap-1 flex-wrap">
                  <span className={["inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded",
                    BADGE_COLOR[change.type] ?? "bg-gray-100 text-gray-700"].join(" ")}>
                    {BADGE_LABEL[change.type] ?? change.type}
                  </span>
                  {change.section && change.section !== "general" && SECTION_LABEL[change.section] && (
                    <span className="inline-block text-[10px] font-medium px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                      {SECTION_LABEL[change.section]}
                    </span>
                  )}
                  {accepted && (
                    <span className="ml-auto text-[10px] text-green-600 font-medium flex items-center gap-0.5">
                      <Check className="h-2.5 w-2.5" /> Đã áp dụng
                    </span>
                  )}
                  {rejected && (
                    <span className="ml-auto text-[10px] text-red-500 font-medium flex items-center gap-0.5">
                      <X className="h-2.5 w-2.5" /> Bỏ qua
                    </span>
                  )}
                </div>

                {/* Original → Revised */}
                <div className="space-y-1">
                  <div className="line-through text-red-600 bg-red-50 px-2 py-1 rounded leading-relaxed break-words">
                    {change.original}
                  </div>
                  <div className="text-green-700 bg-green-50 px-2 py-1 rounded leading-relaxed break-words">
                    {change.revised}
                  </div>
                </div>

                {change.reason && (
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{change.reason}</p>
                )}

                {/* Action buttons */}
                {!accepted && !rejected && (
                  <div className="flex gap-1.5 pt-0.5">
                    <button
                      onClick={() => applyChange(i)}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md bg-green-50 text-green-700 hover:bg-green-100 text-[11px] font-medium transition-colors border border-green-200"
                    >
                      <Check className="h-3 w-3" /> Áp dụng
                    </button>
                    <button
                      onClick={() => rejectChange(i)}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md bg-red-50 text-red-600 hover:bg-red-100 text-[11px] font-medium transition-colors border border-red-200"
                    >
                      <X className="h-3 w-3" /> Bỏ qua
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer — Apply all pending */}
        {pendingCount > 0 && (
          <div className="px-4 py-3 border-t shrink-0">
            <button
              onClick={applyAllPending}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-colors"
            >
              <Check className="h-3.5 w-3.5" />
              Áp dụng tất cả ({pendingCount})
            </button>
          </div>
        )}

        {/* Loading overlay while reviewing */}
        {isReviewing && (
          <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center gap-3 z-10">
            <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
            <p className="text-sm text-violet-700 font-medium">Đang rà soát văn bản...</p>
          </div>
        )}
      </div>

    </div>
  );
}
