"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ocrApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ChevronRight, Download, FileText, Loader2, Link2, Printer } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface OcrJob {
  id: string;
  filename: string;
  status: "pending" | "processing" | "done" | "error";
  text: string | null;
  page_count: number | null;
  char_count: number | null;
  error_msg: string | null;
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
  const [isExporting, setIsExporting] = useState(false);

  const { data: rawData, isLoading, isError } = useQuery({
    queryKey: ["ocr-job", id],
    queryFn: async () => {
      const res = await ocrApi.getJob(id);
      return res.data as OcrJob;
    },
  });

  const handleExport = async (format: "docx" | "pdf") => {
    if (!rawData?.text) return;
    setIsExporting(true);
    try {
      const res = await ocrApi.export(rawData.text, rawData.filename, format);
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `${rawData.filename.replace(/\.[^.]+$/, "")}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: "Lỗi xuất file", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({ title: "Đã sao chép liên kết" });
  };

  // ── Loading ────────────────────────────────────────────────────────────────

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

  // ── Not ready yet ──────────────────────────────────────────────────────────

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

  // ── Done — render 2-column layout ─────────────────────────────────────────

  return (
    <div className="flex flex-row h-full gap-0">

      {/* ── Cột trái — nội dung ─────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-6">

        {/* Breadcrumb */}
        <div className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
          <Link href="/dashboard/ocr" className="hover:text-foreground transition-colors">
            OCR Văn bản
          </Link>
          <ChevronRight className="size-4" />
          <span className="truncate max-w-xs">{rawData.filename}</span>
        </div>

        {/* Tiêu đề */}
        <h1 className="text-xl font-bold">{rawData.filename}</h1>

        <div className="border-t my-4" />

        {/* Nội dung văn bản */}
        {!rawData.text ? (
          <p className="text-muted-foreground italic">Không có nội dung</p>
        ) : (
          <textarea
            className="w-full min-h-[600px] font-mono text-xs resize-none border rounded p-3 bg-muted/30 focus:outline-none focus:ring-2 focus:ring-ring"
            value={rawData.text}
            readOnly
          />
        )}
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

          {/* Xuất file */}
          <div>
            <p className="text-xs text-muted-foreground uppercase mb-2">Xuất file</p>
            <div className="flex flex-col gap-2">
              <Button
                className="w-full justify-start gap-2"
                onClick={() => handleExport("docx")}
                disabled={isExporting}
              >
                {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Tải xuống Word
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={() => handleExport("pdf")}
                disabled={isExporting}
              >
                {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                Tải xuống PDF
              </Button>
            </div>
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
