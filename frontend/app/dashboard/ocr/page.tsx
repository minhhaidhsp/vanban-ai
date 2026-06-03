"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ocrApi, refDocApi, type RefDoc } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  CheckCircle2, Download, FileText, Loader2, ScanText, Upload,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { AxiosError } from "axios";

// ── Types ─────────────────────────────────────────────────────────────────────

type OcrStatus = "idle" | "loading" | "done" | "error";

interface OcrResult {
  filename: string;
  text: string;
  char_count: number;
  page_count: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("vi-VN");
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function OcrPage() {
  const { toast } = useToast();

  // ── Existing indexed-docs query ──────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ["reference-docs-ocr"],
    queryFn: () => refDocApi.list({ limit: 100 }),
  });

  const indexed = (data?.items ?? []).filter((doc) => (doc.chunk_count ?? 0) > 0);

  const handleExport = async (doc: RefDoc, format: "docx" | "pdf") => {
    try {
      const response = await refDocApi.exportFile(doc.id, format);
      const url = URL.createObjectURL(response.data as Blob);
      const rawName = doc.so_ki_hieu || doc.title || doc.id;
      const safeName = rawName.replace(/[/\\:*?"<>|]/g, "_").substring(0, 120);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${safeName}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: "Xuất file thất bại", variant: "destructive" });
    }
  };

  // ── OCR Sheet state ──────────────────────────────────────────────────────
  const [sheetOpen, setSheetOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<OcrStatus>("idle");
  const [result, setResult] = useState<OcrResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetSheet = () => {
    setFile(null);
    setStatus("idle");
    setResult(null);
    setErrorMsg(null);
  };

  const handleFileSelect = (selected: File | null) => {
    if (!selected) return;
    setFile(selected);
    setStatus("idle");
    setResult(null);
    setErrorMsg(null);
  };

  const handleExtract = async () => {
    if (!file) return;
    setStatus("loading");
    setErrorMsg(null);
    try {
      const res = await ocrApi.extract(file);
      setResult(res.data as OcrResult);
      setStatus("done");
    } catch (err: unknown) {
      const msg =
        (err as AxiosError<{ detail: string }>)?.response?.data?.detail ||
        "Có lỗi xảy ra khi OCR";
      setErrorMsg(msg);
      setStatus("error");
    }
  };

  const handleOcrExport = async (format: "docx" | "pdf") => {
    if (!result) return;
    try {
      const res = await ocrApi.export(result.text, result.filename, format);
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `${result.filename.replace(/\.[^.]+$/, "")}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: "Lỗi xuất file", variant: "destructive" });
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full gap-4">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ScanText className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-semibold">OCR Văn bản</h1>
        </div>
        <Button onClick={() => setSheetOpen(true)}>
          <ScanText className="w-4 h-4 mr-2" />
          OCR PDF mới
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        Danh sách văn bản đã được OCR và lập chỉ mục ({indexed.length} văn bản)
      </p>

      {/* ── Indexed docs table ───────────────────────────────────────────── */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : indexed.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
          <ScanText className="h-12 w-12 opacity-20" />
          <p className="text-sm">Chưa có văn bản nào được lập chỉ mục.</p>
          <p className="text-xs">
            Hãy upload văn bản tại{" "}
            <Link
              href="/dashboard/reference-docs"
              className="text-primary underline underline-offset-2"
            >
              Kho văn bản tham chiếu
            </Link>
            .
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tên văn bản</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground w-[120px]">Loại VB</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground w-[160px]">Số ký hiệu</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground w-[120px]">Ngày upload</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground w-[110px]">Số chunk</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground w-[150px]">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {indexed.map((doc) => (
                <tr key={doc.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium max-w-xs truncate">{doc.title}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{doc.loai_van_ban || "—"}</td>
                  <td className="px-4 py-3 text-xs font-mono text-muted-foreground">{doc.so_ki_hieu || "—"}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(doc.created_at)}</td>
                  <td className="px-4 py-3">
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200 whitespace-nowrap">
                      {doc.chunk_count} chunks
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/dashboard/ocr/${doc.id}`}>Xem</Link>
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Download className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleExport(doc, "docx")}>
                            Tải xuống Word
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleExport(doc, "pdf")}>
                            Tải xuống PDF
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── OCR Dialog (Sheet replacement) ──────────────────────────────── */}
      <Dialog
        open={sheetOpen}
        onOpenChange={(open) => {
          setSheetOpen(open);
          if (!open) resetSheet();
        }}
      >
        <DialogContent className="sm:max-w-[560px] flex flex-col max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>OCR Văn bản</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4 flex-1 overflow-y-auto">

            {/* ── idle / loading ─────────────────────────────────────── */}
            {status !== "done" && (
              <>
                {/* Drop zone */}
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                    dragOver
                      ? "border-primary bg-primary/5"
                      : "border-muted-foreground/30 hover:border-primary/50"
                  }`}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    handleFileSelect(e.dataTransfer.files[0] ?? null);
                  }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => {
                      handleFileSelect(e.target.files?.[0] ?? null);
                      e.target.value = "";
                    }}
                  />
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Upload className="h-8 w-8" />
                    <p className="text-sm font-medium">
                      Kéo thả file vào đây hoặc click để chọn
                    </p>
                    <p className="text-xs">Hỗ trợ PDF, JPG, PNG — tối đa 20MB</p>
                  </div>
                </div>

                {/* Selected file info */}
                {file && (
                  <div className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                    <FileText className="h-4 w-4 text-primary shrink-0" />
                    <span className="flex-1 truncate font-medium">{file.name}</span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {formatBytes(file.size)}
                    </span>
                  </div>
                )}

                {/* Error state */}
                {status === "error" && errorMsg && (
                  <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 flex items-start justify-between gap-2">
                    <p className="text-sm text-destructive">{errorMsg}</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="shrink-0 text-destructive hover:text-destructive"
                      onClick={() => setStatus("idle")}
                    >
                      Thử lại
                    </Button>
                  </div>
                )}

                {/* Start button */}
                {file && (
                  <Button
                    className="w-full"
                    onClick={handleExtract}
                    disabled={status === "loading"}
                  >
                    {status === "loading" ? (
                      <><Loader2 className="h-4 w-4 animate-spin mr-2" />Đang OCR...</>
                    ) : (
                      <><ScanText className="h-4 w-4 mr-2" />Bắt đầu OCR</>
                    )}
                  </Button>
                )}
              </>
            )}

            {/* ── done ──────────────────────────────────────────────── */}
            {status === "done" && result && (
              <>
                {/* Result header */}
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                  <div>
                    <p className="font-semibold text-sm">Hoàn tất OCR</p>
                    <p className="text-sm text-muted-foreground">
                      {result.page_count} trang • {result.char_count.toLocaleString("vi-VN")} ký tự
                    </p>
                  </div>
                </div>

                {/* Text preview */}
                <textarea
                  className="flex-1 min-h-[300px] w-full rounded-md border bg-muted/30 px-3 py-2 font-mono text-xs resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                  value={result.text}
                  readOnly
                />

                {/* Export buttons */}
                <div className="flex flex-wrap gap-2">
                  <Button className="flex-1" onClick={() => handleOcrExport("docx")}>
                    <Download className="h-4 w-4 mr-2" />
                    Tải Word
                  </Button>
                  <Button variant="outline" className="flex-1" onClick={() => handleOcrExport("pdf")}>
                    <FileText className="h-4 w-4 mr-2" />
                    Tải PDF
                  </Button>
                  <Button variant="ghost" size="sm" className="w-full" onClick={resetSheet}>
                    OCR file khác
                  </Button>
                </div>
              </>
            )}

          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
