"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  FileText, FilePen, Upload, Mic, ArrowUp, X, Plus,
  HardDrive, Loader2, Image as ImageIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ocrApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const DOC_PILLS = [
  { label: "Công văn",   abbr: "CV"  },
  { label: "Quyết định", abbr: "QĐ"  },
  { label: "Tờ trình",   abbr: "TTr" },
  { label: "Thông báo",  abbr: "TB"  },
  { label: "Báo cáo",    abbr: "BC"  },
  { label: "Kế hoạch",   abbr: "KH"  },
  { label: "+ Khác",     abbr: ""    },
];

export interface WelcomePanelProps {
  onSelectTemplate: (abbr: string) => void;
  onSelectBlank: () => void;
  onSelectBlankWithContent: (text: string, filename: string) => void;
  onGenerate: (yeuCau: string, loai: string) => void;
  onAddReferenceFile?: (file: File) => void;
  isGenerating?: boolean;
}

// ── OCR helper ────────────────────────────────────────────────────────────────
async function runOcr(
  file: File,
  onProgress: (pct: number) => void,
): Promise<string> {
  const { data: job } = await ocrApi.extract(file);

  if (job.status === "done") {
    onProgress(100);
    const text = job.formatted_text || job.text || "";
    ocrApi.remove(job.id).catch(() => {});
    return text;
  }

  const MAX_WAIT_MS = 120_000;
  const INTERVAL_MS = 2_000;
  const started = Date.now();

  return new Promise<string>((resolve, reject) => {
    const tick = async () => {
      if (Date.now() - started > MAX_WAIT_MS) {
        reject(new Error("Timeout"));
        return;
      }
      try {
        const [{ data: detail }, progressRes] = await Promise.all([
          ocrApi.getJob(job.id),
          ocrApi.getProgress(job.id).catch(() => null),
        ]);

        if (progressRes?.data?.percent != null) {
          onProgress(Math.round(progressRes.data.percent));
        } else if (detail.status === "processing") {
          onProgress(0);
        }

        if (detail.status === "done") {
          onProgress(100);
          const text = detail.formatted_text || detail.text || "";
          ocrApi.remove(job.id).catch(() => {});
          resolve(text);
        } else if (detail.status === "failed") {
          reject(new Error(detail.error_msg || "OCR failed"));
        } else {
          setTimeout(tick, INTERVAL_MS);
        }
      } catch (e) {
        reject(e);
      }
    };
    setTimeout(tick, INTERVAL_MS);
  });
}

// ── WelcomePanel ──────────────────────────────────────────────────────────────
export function WelcomePanel({
  onSelectBlank,
  onSelectBlankWithContent,
  onGenerate,
  onAddReferenceFile,
  isGenerating,
}: WelcomePanelProps) {
  const { toast } = useToast();

  // Option toggle
  const [activeOption, setActiveOption] = useState<"create" | "edit">("create");

  // ── Option A state ─────────────────────────────────────────────────────────
  const [yeuCau, setYeuCau] = useState("");
  const [selectedLoai, setSelectedLoai] = useState("");
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createProgress, setCreateProgress] = useState(0);

  const recognitionRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const plusMenuRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ── Option B state ─────────────────────────────────────────────────────────
  const [editFile, setEditFile] = useState<File | null>(null);
  const [editDragOver, setEditDragOver] = useState(false);
  const [isOcrLoading, setIsOcrLoading] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  // ── Speech recognition setup ───────────────────────────────────────────────
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) { setSpeechSupported(false); return; }
    setSpeechSupported(true);
    const recognition = new SpeechRecognition();
    recognition.lang = "vi-VN";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setYeuCau((prev) => prev + (prev.trim() ? " " : "") + transcript);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
    return () => {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
    };
  }, []);

  // ── Click-outside: close plus menu ────────────────────────────────────────
  useEffect(() => {
    if (!showPlusMenu) return;
    const handler = (e: MouseEvent) => {
      if (plusMenuRef.current && !plusMenuRef.current.contains(e.target as Node)) {
        setShowPlusMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showPlusMenu]);

  // ── Fake OCR progress increment (smooth UX while polling) ─────────────────
  useEffect(() => {
    if (!isOcrLoading) return;
    const t = setInterval(() => setOcrProgress((p) => p < 85 ? p + 4 : p), 1800);
    return () => clearInterval(t);
  }, [isOcrLoading]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleToggleMic = useCallback(() => {
    if (!recognitionRef.current || isSubmitting || isGenerating) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try { recognitionRef.current.start(); setIsListening(true); } catch {}
    }
  }, [isListening, isSubmitting, isGenerating]);

  const handleSubmitCreate = useCallback(async () => {
    if (!yeuCau.trim() || isSubmitting || isGenerating) return;
    setIsSubmitting(true);
    setCreateProgress(0);
    try {
      if (attachedFile) {
        // Upload lên SourcesPanel ngay (fire-and-forget — SourcesPanel tự hiện spinner)
        onAddReferenceFile?.(attachedFile);
        // OCR để AI có context file
        const text = await runOcr(attachedFile, setCreateProgress);
        const enriched = `${yeuCau}\n\n[Tài liệu tham chiếu:]\n${text}`;
        await onGenerate(enriched, selectedLoai);
      } else {
        await onGenerate(yeuCau, selectedLoai);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Lỗi xử lý";
      toast({
        title: msg === "Timeout" ? "Xử lý file quá lâu. Vui lòng thử lại." : `Lỗi: ${msg}`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
      setCreateProgress(0);
    }
  }, [yeuCau, attachedFile, selectedLoai, isSubmitting, isGenerating, onGenerate, onAddReferenceFile, toast]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmitCreate();
    }
  };

  const handleEditFileSelect = (file: File) => {
    if (file.size > 20 * 1024 * 1024) {
      toast({ title: "File quá lớn. Vui lòng chọn file nhỏ hơn 20MB.", variant: "destructive" });
      return;
    }
    setEditFile(file);
  };

  const handleSubmitEdit = useCallback(async () => {
    if (!editFile || isOcrLoading) return;
    setIsOcrLoading(true);
    setOcrProgress(0);
    try {
      // Upload lên SourcesPanel ngay (fire-and-forget — SourcesPanel tự hiện spinner)
      onAddReferenceFile?.(editFile);
      const text = await runOcr(editFile, setOcrProgress);
      onSelectBlankWithContent(text, editFile.name);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Lỗi xử lý file";
      toast({
        title: msg === "Timeout"
          ? "Xử lý file quá lâu. Vui lòng thử lại với file nhỏ hơn."
          : `Không thể xử lý file: ${msg}`,
        variant: "destructive",
      });
    } finally {
      setIsOcrLoading(false);
      setOcrProgress(0);
    }
  }, [editFile, isOcrLoading, onSelectBlankWithContent, onAddReferenceFile, toast]);

  const isLoading = isSubmitting || !!isGenerating || isOcrLoading;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="h-full overflow-y-auto bg-[#e5e7eb] flex items-center justify-center py-8 px-4 min-h-full">
      <div className="bg-white rounded-2xl shadow-lg max-w-xl w-full mx-auto p-6">

        {/* Header */}
        <h2 className="text-xl font-medium text-foreground text-center mb-5">
          Bạn muốn làm gì?
        </h2>

        {/* Option toggle */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <button
            type="button"
            onClick={() => setActiveOption("create")}
            className={cn(
              "flex flex-col items-center gap-2 p-4 rounded-xl text-center transition-all",
              activeOption === "create"
                ? "border-2 border-brand-600 bg-brand-50"
                : "border border-border bg-white hover:bg-gray-50"
            )}
          >
            <FileText className={cn("h-6 w-6", activeOption === "create" ? "text-brand-600" : "text-muted-foreground")} />
            <span className={cn("text-sm font-medium", activeOption === "create" ? "text-brand-700" : "text-foreground")}>
              Tạo văn bản mới
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveOption("edit")}
            className={cn(
              "flex flex-col items-center gap-2 p-4 rounded-xl text-center transition-all",
              activeOption === "edit"
                ? "border-2 border-green-600 bg-green-50"
                : "border border-border bg-white hover:bg-gray-50"
            )}
          >
            <FilePen className={cn("h-6 w-6", activeOption === "edit" ? "text-green-600" : "text-muted-foreground")} />
            <span className={cn("text-sm font-medium", activeOption === "edit" ? "text-green-700" : "text-foreground")}>
              Chỉnh sửa file có sẵn
            </span>
          </button>
        </div>

        {/* ── OPTION A: Tạo văn bản mới ── */}
        {activeOption === "create" && (
          <div className="space-y-3">
            {(isSubmitting || isGenerating) ? (
              <div className="flex flex-col items-center justify-center py-10 gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-brand-600" />
                <p className="text-base font-medium text-gray-700">AI đang soạn thảo...</p>
                <p className="text-sm text-gray-400">Thường mất 15–30 giây</p>
                {createProgress > 0 && (
                  <div className="w-full max-w-xs">
                    <div className="w-full bg-slate-100 rounded-full h-1.5">
                      <div
                        className="bg-brand-500 h-1.5 rounded-full transition-all duration-500"
                        style={{ width: `${createProgress}%` }}
                      />
                    </div>
                    <p className="text-xs text-center text-muted-foreground mt-1">{createProgress}%</p>
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* Chat input box */}
                <div className={cn(
                  "border rounded-xl overflow-hidden transition-colors",
                  isListening ? "border-red-400" : "border-brand-300"
                )}>
                  {/* Attached file chip */}
                  {attachedFile && (
                    <div className="px-3 pt-2.5">
                      <div className="inline-flex items-center gap-2 bg-brand-50 border border-brand-200 rounded-lg px-3 py-1.5 text-sm">
                        {attachedFile.type.startsWith("image/") ? (
                          <ImageIcon className="h-4 w-4 text-brand-600 shrink-0" />
                        ) : (
                          <FileText className="h-4 w-4 text-brand-600 shrink-0" />
                        )}
                        <span className="truncate max-w-[200px] text-brand-700 font-medium">{attachedFile.name}</span>
                        <button
                          type="button"
                          onClick={() => setAttachedFile(null)}
                          className="text-brand-400 hover:text-brand-600 transition-colors"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Textarea */}
                  <textarea
                    ref={textareaRef}
                    value={yeuCau}
                    onChange={(e) => setYeuCau(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={isListening
                      ? "Đang lắng nghe..."
                      : "VD: Soạn công văn mời họp về triển khai phần mềm quản lý hộ tịch, ngày 25/6/2026 lúc 8h..."
                    }
                    rows={3}
                    className="w-full resize-none border-0 bg-transparent focus:outline-none focus:ring-0 px-3 py-2.5 text-sm leading-relaxed"
                  />

                  {/* Toolbar */}
                  <div className="border-t border-brand-100 bg-brand-50/30 flex items-center justify-between px-3 py-2">
                    {/* Left: + button */}
                    <div className="relative" ref={plusMenuRef}>
                      <button
                        type="button"
                        onClick={() => setShowPlusMenu((v) => !v)}
                        className="w-8 h-8 rounded-full border border-brand-300 text-brand-600 flex items-center justify-center hover:bg-brand-50 transition-colors"
                      >
                        <Plus className="h-4 w-4" />
                      </button>

                      {showPlusMenu && (
                        <div className="absolute left-0 bottom-10 z-50 bg-white shadow-lg rounded-xl border border-border w-52 py-1 overflow-hidden">
                          <button
                            type="button"
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-foreground hover:bg-gray-50 transition-colors"
                            onClick={() => { fileInputRef.current?.click(); setShowPlusMenu(false); }}
                          >
                            <Upload className="h-4 w-4 text-muted-foreground" />
                            Upload files
                          </button>
                          <button
                            type="button"
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-muted-foreground hover:bg-gray-50 transition-colors"
                            onClick={() => { toast({ title: "Tính năng đang phát triển" }); setShowPlusMenu(false); }}
                          >
                            <HardDrive className="h-4 w-4" />
                            Add from Drive
                          </button>
                        </div>
                      )}

                      <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) setAttachedFile(f);
                          e.target.value = "";
                        }}
                      />
                    </div>

                    {/* Right: mic + send */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleToggleMic}
                        disabled={!speechSupported}
                        title={isListening ? "Đang nghe... (click để dừng)" : "Nhập bằng giọng nói"}
                        className={cn(
                          "w-8 h-8 rounded-full border flex items-center justify-center transition-colors",
                          isListening
                            ? "bg-red-100 text-red-600 animate-pulse border-red-300"
                            : "border-border text-muted-foreground hover:bg-gray-100",
                          !speechSupported && "opacity-40 cursor-not-allowed"
                        )}
                      >
                        <Mic className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={handleSubmitCreate}
                        disabled={!yeuCau.trim() || isLoading}
                        className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
                          yeuCau.trim() && !isLoading
                            ? "bg-brand-600 text-white hover:bg-brand-700"
                            : "bg-muted text-muted-foreground cursor-not-allowed"
                        )}
                      >
                        <ArrowUp className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Quick pills */}
                <div className="flex flex-wrap gap-2">
                  {DOC_PILLS.map(({ label, abbr }) => (
                    <button
                      key={abbr || "other"}
                      type="button"
                      onClick={() => {
                        if (!abbr) { textareaRef.current?.focus(); return; }
                        setYeuCau((prev) => prev + (prev.trim() ? " " : "") + `Soạn ${label} `);
                        setSelectedLoai(abbr);
                        textareaRef.current?.focus();
                      }}
                      className={cn(
                        "text-xs px-3 py-1.5 rounded-full border transition-all",
                        abbr && abbr === selectedLoai
                          ? "bg-brand-100 border-brand-400 text-brand-700"
                          : "border-border text-muted-foreground hover:border-brand-300 hover:text-brand-600"
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {/* Link: vào editor trống */}
                <p className="text-center">
                  <button
                    type="button"
                    onClick={onSelectBlank}
                    className="text-sm text-muted-foreground hover:underline underline-offset-2 cursor-pointer"
                  >
                    Vào editor trống
                  </button>
                </p>
              </>
            )}
          </div>
        )}

        {/* ── OPTION B: Chỉnh sửa file có sẵn ── */}
        {activeOption === "edit" && (
          <div className="space-y-4">
            {/* Dropzone */}
            <div
              className={cn(
                "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors",
                editDragOver || editFile
                  ? "border-green-400 bg-green-50"
                  : "border-[#6EE7B7] hover:border-green-400 bg-white"
              )}
              onClick={() => editFileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setEditDragOver(true); }}
              onDragLeave={() => setEditDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setEditDragOver(false);
                const f = e.dataTransfer.files[0];
                if (f) handleEditFileSelect(f);
              }}
            >
              <input
                ref={editFileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleEditFileSelect(f);
                  e.target.value = "";
                }}
              />
              {editFile ? (
                <div className="flex flex-col items-center gap-3">
                  <FileText className="h-8 w-8 text-green-600" />
                  <div className="flex items-center gap-2 flex-wrap justify-center">
                    <span className="text-sm font-medium text-green-700 truncate max-w-[220px]">{editFile.name}</span>
                    <span className="text-xs text-muted-foreground">
                      ({(editFile.size / 1024 / 1024).toFixed(1)} MB)
                    </span>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setEditFile(null); }}
                      className="text-green-400 hover:text-green-600 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <Upload className="h-8 w-8 mx-auto mb-3 text-green-600" />
                  <p className="text-base font-medium text-gray-700">Kéo thả file vào đây</p>
                  <p className="text-sm text-muted-foreground mt-1">hoặc nhấn để chọn file</p>
                  <span className="inline-block mt-3 text-xs px-3 py-1 rounded-full bg-green-50 text-green-700 border border-green-200">
                    PDF · Word · Ảnh chụp · Tối đa 20MB
                  </span>
                </>
              )}
            </div>

            {/* OCR progress bar */}
            {isOcrLoading && (
              <div className="space-y-2">
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-green-500 h-2 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${ocrProgress}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-sm text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="h-3 w-3 animate-spin text-green-500" />
                    Đang xử lý văn bản...
                  </span>
                  <span className="font-medium text-green-600">{ocrProgress}%</span>
                </div>
                <p className="text-xs text-center text-muted-foreground">
                  Có thể mất 15–30 giây tùy kích thước file
                </p>
              </div>
            )}

            {/* CTA */}
            <button
              type="button"
              onClick={handleSubmitEdit}
              disabled={!editFile || isOcrLoading}
              className={cn(
                "w-full py-3 rounded-xl font-medium text-base transition-all",
                editFile && !isOcrLoading
                  ? "bg-green-600 text-white hover:bg-green-700"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
              )}
            >
              {isOcrLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Đang xử lý...
                </span>
              ) : "Mở chỉnh sửa →"}
            </button>

            {/* Link: vào editor trống */}
            <p className="text-center">
              <button
                type="button"
                onClick={onSelectBlank}
                className="text-sm text-muted-foreground hover:underline underline-offset-2 cursor-pointer"
              >
                Vào editor trống
              </button>
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
