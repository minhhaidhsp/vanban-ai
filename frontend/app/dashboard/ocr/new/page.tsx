"use client";

import { useEffect, useRef, useState } from "react";
import { ocrApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  CheckCircle2, ChevronDown, Download, FileText, Loader2, ScanText, Upload, XCircle,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { AxiosError } from "axios";

// ── Types ─────────────────────────────────────────────────────────────────────

type OcrStatus = "idle" | "uploading" | "processing" | "done" | "error";

interface OcrResult {
  filename: string;
  text: string;
  formatted_text: string | null;
  page_count: number | null;
  char_count: number | null;
}

interface OcrJobData {
  status: string;
  filename: string;
  text: string | null;
  formatted_text: string | null;
  page_count: number | null;
  char_count: number | null;
  error_msg: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function OcrNewPage() {
  const { toast } = useToast();

  const [file, setFile]           = useState<File | null>(null);
  const [jobId, setJobId]         = useState<string | null>(null);
  const [status, setStatus]       = useState<OcrStatus>("idle");
  const [result, setResult]       = useState<OcrResult | null>(null);
  const [errorMsg, setErrorMsg]   = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState<"docx" | "pdf" | null>(null);
  const [exportFormat, setExportFormat] = useState<"docx" | "pdf">("docx");
  const [dragOver, setDragOver]   = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const statusRef    = useRef<OcrStatus>("idle");

  const setStatusSync = (s: OcrStatus) => {
    setStatus(s);
    statusRef.current = s;
  };

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const reset = () => {
    if (pollRef.current)    { clearInterval(pollRef.current);   pollRef.current   = null; }
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
    setFile(null);
    setJobId(null);
    setStatusSync("idle");
    setResult(null);
    setErrorMsg(null);
  };

  const handleFileSelect = (selected: File | null) => {
    if (!selected) return;
    setFile(selected);
    if (statusRef.current !== "idle") {
      setStatusSync("idle");
      setResult(null);
      setErrorMsg(null);
    }
  };

  const handleStartOcr = async () => {
    if (!file) return;
    setStatusSync("uploading");
    setErrorMsg(null);

    try {
      const res = await ocrApi.extract(file);
      const newJobId = (res.data as { id: string }).id;
      setJobId(newJobId);
      setStatusSync("processing");

      const poll = setInterval(async () => {
        try {
          const statusRes = await ocrApi.getJob(newJobId);
          const job = statusRes.data as OcrJobData;

          if (job.status === "done") {
            clearInterval(poll);
            pollRef.current = null;
            setResult({
              filename:       job.filename,
              text:           job.text ?? "",
              formatted_text: job.formatted_text ?? null,
              page_count:     job.page_count,
              char_count:     job.char_count,
            });
            setStatusSync("done");
          } else if (job.status === "error") {
            clearInterval(poll);
            pollRef.current = null;
            setErrorMsg(job.error_msg ?? "Có lỗi xảy ra khi OCR");
            setStatusSync("error");
          }
        } catch {
          clearInterval(poll);
          pollRef.current = null;
          setErrorMsg("Mất kết nối, vui lòng thử lại");
          setStatusSync("error");
        }
      }, 2000);
      pollRef.current = poll;

      timeoutRef.current = setTimeout(() => {
        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
        if (statusRef.current === "processing") {
          setErrorMsg("OCR quá thời gian chờ, vui lòng thử lại");
          setStatusSync("error");
        }
      }, 300_000);

    } catch (err: unknown) {
      const msg =
        (err as AxiosError<{ detail: string }>)?.response?.data?.detail ??
        "Có lỗi khi tải file";
      setErrorMsg(msg);
      setStatusSync("error");
    }
  };

  const handleExport = async (format: "docx" | "pdf") => {
    if (!result) return;
    setIsExporting(format);
    try {
      const textToExport = result.formatted_text || result.text;
      const res = await ocrApi.export(textToExport, result.filename, format);
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `${result.filename.replace(/\.[^.]+$/, "")}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: "Lỗi xuất file", variant: "destructive" });
    } finally {
      setIsExporting(null);
    }
  };

  const isActive = status === "uploading" || status === "processing";
  const showDropZone = status === "idle" || status === "error";

  return (
    <div className="flex flex-row h-full gap-0">

      {/* ── Cột trái — Upload & Control ────────────────────────────────── */}
      <div className="w-80 shrink-0 border-r p-6 flex flex-col gap-4 overflow-y-auto">

        {/* Drop zone */}
        {showDropZone && (
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
              dragOver
                ? "border-primary bg-primary/5"
                : file
                ? "border-primary"
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
              <Upload className="size-8" />
              {file ? (
                <>
                  <p className="text-sm font-medium text-foreground truncate max-w-full px-2">
                    {file.name}
                  </p>
                  <p className="text-xs">{formatBytes(file.size)}</p>
                </>
              ) : (
                <>
                  <p className="text-sm font-medium">Kéo thả file vào đây</p>
                  <p className="text-xs">PDF, JPG, PNG — tối đa 20MB</p>
                </>
              )}
            </div>
          </div>
        )}

        {/* Start / loading button */}
        {file !== null && showDropZone && (
          <Button className="w-full" onClick={handleStartOcr} disabled={isActive}>
            <ScanText className="h-4 w-4 mr-2" />
            Bắt đầu OCR
          </Button>
        )}
        {isActive && (
          <Button className="w-full" disabled>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            {status === "uploading" ? "Đang tải file..." : "Đang OCR..."}
          </Button>
        )}

        {/* Status indicator */}
        <div className="rounded-lg border p-3 text-sm">
          {status === "idle" && (
            <p className="text-muted-foreground">Chờ file...</p>
          )}
          {status === "uploading" && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin shrink-0" />
              <span>Đang tải lên...</span>
            </div>
          )}
          {status === "processing" && (
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                <span>Đang nhận dạng văn bản...</span>
              </div>
              <p className="text-xs text-muted-foreground/70 pl-6">
                Có thể mất 30–60 giây với file scan
              </p>
            </div>
          )}
          {status === "done" && result && (
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span className="font-medium">Hoàn tất!</span>
              </div>
              <p className="text-xs text-muted-foreground pl-6">
                {result.page_count != null ? `${result.page_count} trang` : "—"}
                {" • "}
                {result.char_count != null
                  ? `${result.char_count.toLocaleString("vi-VN")} ký tự`
                  : "—"}
              </p>
            </div>
          )}
          {status === "error" && (
            <div className="flex items-start gap-2 text-red-500">
              <XCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span className="break-words">{errorMsg}</span>
            </div>
          )}
        </div>

        {/* ── Split button: Word (primary) + dropdown (PDF) ── */}
        {status === "done" && result && (
          <div className="flex w-full">
            <Button
              className="flex-1 rounded-r-none"
              onClick={() => handleExport(exportFormat)}
              disabled={isExporting !== null}
            >
              {isExporting === exportFormat
                ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                : exportFormat === "docx"
                  ? <Download className="w-4 h-4 mr-2" />
                  : <FileText className="w-4 h-4 mr-2" />}
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
                  <ChevronDown className="w-4 h-4" />
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

        {/* OCR file khác */}
        {(status === "done" || status === "error") && (
          <Button variant="ghost" size="sm" className="w-full" onClick={reset}>
            OCR file khác
          </Button>
        )}

      </div>

      {/* ── Cột phải — Kết quả ─────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-6">

        {(status === "idle" || status === "uploading") && (
          <div className="h-64 border-2 border-dashed rounded-lg flex items-center justify-center">
            <p className="text-sm text-muted-foreground italic">
              Kết quả OCR sẽ hiển thị tại đây
            </p>
          </div>
        )}

        {status === "processing" && (
          <div className="flex flex-col gap-3 max-w-2xl">
            {[100, 75, 83, 100, 67, 91, 80].map((w, i) => (
              <div
                key={i}
                className="h-4 rounded bg-muted animate-pulse"
                style={{ width: `${w}%` }}
              />
            ))}
          </div>
        )}

        {status === "done" && result && (
          <>
            <div className="flex items-center gap-2 mb-3">
              <span className="font-semibold text-sm truncate">{result.filename}</span>
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200 whitespace-nowrap shrink-0">
                ✓ Hoàn tất
              </span>
            </div>
            <div className="border-t mb-3" />
            <textarea
              className="w-full min-h-[500px] font-mono text-xs resize-none border rounded p-3 bg-muted/30 focus:outline-none focus:ring-2 focus:ring-ring"
              value={result.formatted_text || result.text}
              readOnly
            />
          </>
        )}

        {status === "error" && (
          <div className="border border-red-200 rounded-lg p-4 bg-red-50 max-w-lg">
            <div className="flex items-center gap-2 mb-2">
              <XCircle className="h-4 w-4 text-red-500 shrink-0" />
              <span className="font-medium text-sm text-red-700">
                Không thể OCR file này
              </span>
            </div>
            {errorMsg && <p className="text-sm text-red-600 mb-1">{errorMsg}</p>}
            <p className="text-xs text-red-500">
              Hãy thử lại với file khác hoặc kiểm tra định dạng file
            </p>
          </div>
        )}

      </div>

    </div>
  );
}
