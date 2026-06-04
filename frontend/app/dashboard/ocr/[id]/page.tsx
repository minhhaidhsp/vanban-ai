"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ocrApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  ChevronDown, ChevronRight, Download, FileText, Link2, Loader2, Printer,
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

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDateTime(d: string | null) {
  if (!d) return "—";
  const dt = new Date(d);
  const date = dt.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
  const time = dt.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  return `${date} ${time}`;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function OcrDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState<"docx" | "pdf" | null>(null);
  const [exportFormat, setExportFormat] = useState<"docx" | "pdf">("docx");
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [showTextFallback, setShowTextFallback] = useState(false);
  const pdfUrlRef = useRef<string | null>(null);

  const { data: rawData, isLoading, isError } = useQuery({
    queryKey: ["ocr-job", id],
    queryFn: async () => {
      const res = await ocrApi.getJob(id);
      return res.data as OcrJob;
    },
  });

  // Fetch PDF blob for viewer when job is done — retry up to 5× (R2 upload may lag)
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
        // Use pdf2docx for true layout-preserving DOCX; download original for PDF
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
    <div className="flex flex-row h-full gap-0">

      {/* ── Cột trái — nội dung ─────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">

        {/* Header — fixed height */}
        <div className="px-6 pt-6 shrink-0">
          {/* Breadcrumb */}
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
                📄 PDF văn bản
              </span>
            )}
          </div>
          <div className="border-t mt-4" />
        </div>

        {/* Content — fills remaining height */}
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
  );
}
