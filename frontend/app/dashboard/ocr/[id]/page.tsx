"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ocrApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Check, ChevronDown, ChevronRight, Copy, Download, FileText,
  Link2, Loader2, Printer, Sparkles, X,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import dynamic from "next/dynamic";
const PdfViewer = dynamic(
  () => import("@/components/ocr/PdfViewer").then((m) => m.PdfViewer),
  { ssr: false },
);

// ── Types ─────────────────────────────────────────────────────────────────────

interface OcrJob {
  id: string;
  filename: string;
  status: "pending" | "processing" | "done" | "error";
  text: string | null;
  formatted_text: string | null;
  page_count: number | null;
  char_count: number | null;
  error_msg: string | null;
  file_type: "text_pdf" | "text_docx" | "scanned_pdf" | "image" | null;
  created_at: string;
}

interface ReviewChange {
  type: "chinh_ta" | "the_thuc" | "van_phong" | "dau_cau" | "thuat_ngu";
  original: string;
  revised: string;
  reason: string;
}

interface ReviewResult {
  reviewed_text: string;
  changes: ReviewChange[];
  summary: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDateTime(d: string | null) {
  if (!d) return "—";
  const dt = new Date(d);
  const date = dt.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
  const time = dt.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  return `${date} ${time}`;
}

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

// ── Page ──────────────────────────────────────────────────────────────────────

export default function OcrDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const { toast } = useToast();

  const [isExporting, setIsExporting] = useState<"docx" | "pdf" | null>(null);
  const [exportFormat, setExportFormat] = useState<"docx" | "pdf">("docx");
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [showTextFallback, setShowTextFallback] = useState(false);

  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewResult, setReviewResult] = useState<ReviewResult | null>(null);
  const [showReview, setShowReview] = useState(false);
  const [reviewTab, setReviewTab] = useState<"text" | "changes">("text");
  const [copied, setCopied] = useState(false);
  const [isExportingReview, setIsExportingReview] = useState(false);

  const pdfUrlRef = useRef<string | null>(null);

  const { data: rawData, isLoading, isError } = useQuery({
    queryKey: ["ocr-job", id],
    queryFn: async () => {
      const res = await ocrApi.getJob(id);
      return res.data as OcrJob;
    },
  });

  // Fetch PDF blob when job done — retry up to 5× (R2 upload may lag)
  useEffect(() => {
    if (rawData?.status !== "done" || !rawData?.id) return;
    let cancelled = false;
    let retryCount = 0;
    const MAX_RETRY = 5;

    const tryFetch = async () => {
      try {
        const res = await ocrApi.download(rawData.id);
        if (cancelled) return;
        if (pdfUrlRef.current) URL.revokeObjectURL(pdfUrlRef.current);
        const url = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
        pdfUrlRef.current = url;
        setPdfUrl(url);
      } catch {
        if (cancelled) return;
        retryCount++;
        if (retryCount < MAX_RETRY) {
          setTimeout(tryFetch, 2000);
        } else {
          setShowTextFallback(true);
          setPdfUrl(null);
        }
      }
    };

    tryFetch();

    return () => {
      cancelled = true;
      if (pdfUrlRef.current) {
        URL.revokeObjectURL(pdfUrlRef.current);
        pdfUrlRef.current = null;
        setPdfUrl(null);
      }
    };
  }, [rawData?.id, rawData?.status]);

  const handleExport = async (format: "docx" | "pdf") => {
    if (!rawData) return;
    if (rawData.file_type !== "text_pdf" && !rawData.text) return;
    setIsExporting(format);
    try {
      let res;
      if (rawData.file_type === "text_pdf") {
        res = format === "docx"
          ? await ocrApi.exportDocx(rawData.id)
          : await ocrApi.download(rawData.id);
      } else {
        const textToExport = rawData.formatted_text || rawData.text || "";
        res = await ocrApi.export(textToExport, rawData.filename, format);
      }
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `${rawData.filename.replace(/\.[^.]+$/, "")}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: "Lỗi xuất file", variant: "destructive" });
    } finally {
      setIsExporting(null);
    }
  };

  const handleDownloadOriginal = async () => {
    if (!rawData?.id) return;
    try {
      const res = await ocrApi.download(rawData.id);
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = rawData.filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: "Lỗi tải file", variant: "destructive" });
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({ title: "Đã sao chép liên kết" });
  };

  const handleReview = async () => {
    if (!rawData?.id) return;
    setIsReviewing(true);
    try {
      const data = await ocrApi.review(rawData.id);
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

  const handleExportReview = async () => {
    if (!reviewResult || !rawData) return;
    setIsExportingReview(true);
    try {
      const res = await ocrApi.export(reviewResult.reviewed_text, rawData.filename, "docx");
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `${rawData.filename.replace(/\.[^.]+$/, "")}_reviewed.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: "Lỗi xuất file", variant: "destructive" });
    } finally {
      setIsExportingReview(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !rawData) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
        <p className="text-sm">Không tìm thấy kết quả OCR</p>
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/ocr">Quay lại</Link>
        </Button>
      </div>
    );
  }

  if (rawData.status !== "done") {
    const statusLabel: Record<string, string> = {
      pending:    "⏳ Chờ xử lý",
      processing: "Đang OCR...",
      error:      `✗ Lỗi: ${rawData.error_msg ?? "Không xác định"}`,
    };
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
        <span className="text-[10px] font-medium px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 border border-yellow-200">
          {statusLabel[rawData.status] ?? rawData.status}
        </span>
        <p className="text-sm">Kết quả chưa sẵn sàng</p>
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/ocr">Quay lại danh sách</Link>
        </Button>
      </div>
    );
  }

  const displayText = rawData.formatted_text || rawData.text;
  const isTextPdf = rawData.file_type === "text_pdf";

  return (
    <>
      <div className="flex flex-row h-full gap-0">

        {/* ── Cột trái — nội dung ─────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">

          {/* Header */}
          <div className="px-6 pt-6 shrink-0">
            <div className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
              <Link href="/dashboard/ocr" className="hover:text-foreground transition-colors">
                OCR Văn bản
              </Link>
              <ChevronRight className="size-4" />
              <span className="truncate max-w-xs">{rawData.filename}</span>
            </div>

            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl font-bold">{rawData.filename}</h1>
              {isTextPdf && (
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200 whitespace-nowrap shrink-0">
                  PDF văn bản
                </span>
              )}
            </div>
            <div className="border-t mt-4" />
          </div>

          {/* Content */}
          <div className="flex-1 flex flex-col min-h-0 px-6 pb-6 pt-4">
            {pdfUrl ? (
              <PdfViewer url={pdfUrl} className="flex-1 min-h-0" />
            ) : null}
            {!pdfUrl && showTextFallback && (
              !displayText ? (
                <p className="text-muted-foreground italic">Không có nội dung</p>
              ) : (
                <textarea
                  readOnly
                  value={displayText}
                  className="w-full flex-1 min-h-[500px] font-mono text-xs resize-none border rounded p-3 bg-muted/30"
                />
              )
            )}
          </div>
        </div>

        {/* ── Cột phải — tools ────────────────────────────────────────────── */}
        <div className="w-72 shrink-0 border-l p-4">
          <div className="sticky top-0 flex flex-col gap-3">

            {/* File info */}
            <div>
              <p className="text-xs text-muted-foreground uppercase mb-1">Văn bản</p>
              <p className="font-semibold text-sm break-words">{rawData.filename}</p>
            </div>

            <div className="border-t" />

            {/* Xuất / Tải file */}
            <div>
              <p className="text-xs text-muted-foreground uppercase mb-2">
                {isTextPdf ? "Tải về / Xuất" : "Xuất file"}
              </p>
              {isTextPdf ? (
                <div className="flex w-full">
                  <Button
                    className="flex-1 rounded-r-none justify-start gap-2"
                    onClick={handleDownloadOriginal}
                    disabled={isExporting !== null}
                  >
                    <Download className="h-4 w-4" />
                    Tải file gốc
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        className="rounded-l-none border-l-0 px-2"
                        disabled={isExporting !== null}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={handleDownloadOriginal}>
                        <Download className="w-4 h-4 mr-2" />
                        Tải file gốc (.pdf)
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleExport("docx")}>
                        Tải Word (.docx)
                        {isExporting === "docx" && (
                          <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                        )}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ) : (
                <div className="flex w-full">
                  <Button
                    className="flex-1 rounded-r-none justify-start gap-2"
                    onClick={() => handleExport(exportFormat)}
                    disabled={isExporting !== null}
                  >
                    {isExporting === exportFormat
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : exportFormat === "docx"
                        ? <Download className="h-4 w-4" />
                        : <FileText className="h-4 w-4" />}
                    {isExporting === exportFormat
                      ? "Đang xuất..."
                      : exportFormat === "docx" ? "Tải Word" : "Tải PDF"}
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        className="rounded-l-none border-l-0 px-2"
                        disabled={isExporting !== null}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => { setExportFormat("docx"); handleExport("docx"); }}>
                        <Download className="w-4 h-4 mr-2" />
                        Tải Word (.docx)
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { setExportFormat("pdf"); handleExport("pdf"); }}>
                        <FileText className="w-4 h-4 mr-2" />
                        Tải PDF
                        {isExporting === "pdf" && (
                          <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                        )}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </div>

            <div className="border-t" />

            {/* AI Review */}
            <div>
              <p className="text-xs text-muted-foreground uppercase mb-2">AI</p>
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={handleReview}
                disabled={isReviewing}
              >
                {isReviewing
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <Sparkles className="h-4 w-4" />}
                {isReviewing ? "Đang rà soát..." : "AI Review văn bản"}
              </Button>
            </div>

            <div className="border-t" />

            {/* Công cụ */}
            <div>
              <p className="text-xs text-muted-foreground uppercase mb-2">Công cụ</p>
              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={() => window.print()}
                >
                  <Printer className="h-4 w-4" />
                  In trang này
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={handleCopyLink}
                >
                  <Link2 className="h-4 w-4" />
                  Sao chép liên kết
                </Button>
              </div>
            </div>

            <div className="border-t" />

            {/* Thống kê */}
            <div className="flex flex-col gap-1 text-xs text-muted-foreground">
              <span>Số trang: {rawData.page_count ?? "—"}</span>
              <span>
                Số ký tự:{" "}
                {rawData.char_count != null
                  ? rawData.char_count.toLocaleString("vi-VN")
                  : "—"}
              </span>
              <span>Ngày tạo: {formatDateTime(rawData.created_at)}</span>
            </div>

          </div>
        </div>
      </div>

      {/* ── Review Panel backdrop ──────────────────────────────────────────── */}
      {showReview && (
        <div
          className="fixed inset-0 bg-black/20 z-40"
          onClick={() => setShowReview(false)}
        />
      )}

      {/* ── Review Panel (slide-in drawer) ────────────────────────────────── */}
      <div
        className={[
          "fixed top-0 right-0 h-full w-[480px] bg-white shadow-2xl border-l z-50 flex flex-col",
          "transition-transform duration-300",
          showReview ? "translate-x-0" : "translate-x-full",
        ].join(" ")}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-violet-50 shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-violet-600" />
            <span className="font-semibold text-sm">AI Review</span>
          </div>
          <button
            onClick={() => setShowReview(false)}
            className="text-muted-foreground hover:text-foreground p-1 rounded transition-colors"
            aria-label="Đóng"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {reviewResult && (
          <>
            {/* Summary */}
            {reviewResult.summary && (
              <div className="mx-4 mt-3 p-3 bg-green-50 rounded-lg border border-green-200 shrink-0">
                <p className="text-[10px] font-semibold uppercase text-green-700 mb-1">Tóm tắt</p>
                <p className="text-xs text-green-800">{reviewResult.summary}</p>
              </div>
            )}

            {/* Tabs */}
            <div className="flex border-b mt-3 px-4 shrink-0">
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

            {/* Tab content */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4">

              {reviewTab === "text" && (
                <div className="flex flex-col h-full gap-3">
                  <textarea
                    readOnly
                    value={reviewResult.reviewed_text}
                    className="flex-1 min-h-[300px] font-mono text-xs resize-none border rounded-lg p-3 bg-muted/30"
                  />
                  <div className="flex gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      onClick={handleCopyReview}
                    >
                      {copied
                        ? <Check className="h-3.5 w-3.5 text-green-600" />
                        : <Copy className="h-3.5 w-3.5" />}
                      {copied ? "Đã copy" : "Copy"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      onClick={handleExportReview}
                      disabled={isExportingReview}
                    >
                      {isExportingReview
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <Download className="h-3.5 w-3.5" />}
                      Xuất DOCX
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
                  {reviewResult.changes.map((change, i) => (
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
          </>
        )}
      </div>
    </>
  );
}
