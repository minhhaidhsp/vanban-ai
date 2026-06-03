"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { refDocApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Download, FileText, Printer, Link2, ChevronRight, Loader2 } from "lucide-react";

export default function OcrDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const { toast } = useToast();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["ref-doc-content", id],
    queryFn: () => refDocApi.getContent(id),
  });

  const handleExport = async (format: "docx" | "pdf") => {
    try {
      const res = await refDocApi.exportFile(id, format);
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `${data?.so_ki_hieu || data?.title || id}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: "Lỗi xuất file", variant: "destructive" });
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

  if (isError || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
        <p className="text-sm">Không tìm thấy văn bản</p>
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/ocr">Quay lại</Link>
        </Button>
      </div>
    );
  }

  const fullText = data.chunks
    .sort((a, b) => a.chunk_index - b.chunk_index)
    .map((c) => c.content)
    .join("\n\n");

  return (
    <div className="flex flex-row h-full gap-0">

      {/* ── Cột trái — nội dung ─────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-6">

        {/* Breadcrumb */}
        <div className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
          <Link href="/dashboard/ocr" className="hover:text-foreground transition-colors">
            OCR Văn bản
          </Link>
          <ChevronRight className="size-4" />
          <span className="truncate max-w-xs">{data.title}</span>
        </div>

        {/* Tiêu đề */}
        <h1 className="text-xl font-bold">{data.title}</h1>
        {data.so_ki_hieu && (
          <p className="text-sm text-muted-foreground mt-1">{data.so_ki_hieu}</p>
        )}

        <div className="border-t my-4" />

        {/* Nội dung văn bản */}
        {data.chunks.length === 0 ? (
          <p className="text-muted-foreground italic">Không có nội dung</p>
        ) : (
          <div className="prose prose-sm max-w-none">
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed bg-transparent border-0 p-0 m-0">
              {fullText}
            </pre>
          </div>
        )}
      </div>

      {/* ── Cột phải — tools ────────────────────────────────────────── */}
      <div className="w-72 shrink-0 border-l p-4">
        <div className="sticky top-0 flex flex-col gap-3">

          {/* Tên file */}
          <div>
            <p className="text-xs text-muted-foreground uppercase mb-1">Văn bản</p>
            <p className="font-semibold text-sm">{data.title}</p>
            {data.so_ki_hieu && (
              <span className="text-xs text-muted-foreground">{data.so_ki_hieu}</span>
            )}
          </div>

          <div className="border-t" />

          {/* Xuất file */}
          <div>
            <p className="text-xs text-muted-foreground uppercase mb-2">Xuất file</p>
            <div className="flex flex-col gap-2">
              <Button className="w-full justify-start gap-2" onClick={() => handleExport("docx")}>
                <Download className="h-4 w-4" />
                Tải xuống Word
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2" onClick={() => handleExport("pdf")}>
                <FileText className="h-4 w-4" />
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
            <span>Số chunk: {data.chunks.length}</span>
            <span>Loại: {data.loai_van_ban || "—"}</span>
          </div>

        </div>
      </div>

    </div>
  );
}
