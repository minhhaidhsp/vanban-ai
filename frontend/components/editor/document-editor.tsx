"use client";

import { useCallback, useRef, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { documentApi, ocrApi } from "@/lib/api";
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
  PanelLeft, PanelRight, ArrowLeft, X, Sparkles, FileText,
  Mail, BarChart3, Bell, CheckSquare, CalendarDays,
  ClipboardList, UserPlus, BookOpen, FilePlus2, LayoutGrid, Upload,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { LucideIcon } from "lucide-react";
import type { Nd30Data } from "@/lib/nd30";
import { defaultNd30Data, VAN_BAN_TYPES } from "@/lib/nd30";
import type { Editor } from "@tiptap/react";
import type { ReviewChange } from "@/lib/api";

// ── WelcomePanel ──────────────────────────────────────────────────────────────

interface WelcomePanelProps {
  onSelectTemplate: (abbr: string) => void;
  onSelectBlank: () => void;
  onSelectBlankWithContent: (text: string, filename: string) => void;
  onGenerate: (yeuCau: string, loai: string) => void;
  generating: boolean;
}

const TEMPLATE_OPTIONS: Array<{ abbr: string; label: string; Icon: LucideIcon }> = [
  { abbr: "CV",  label: "Công văn",   Icon: Mail },
  { abbr: "TTr", label: "Tờ trình",   Icon: FileText },
  { abbr: "BC",  label: "Báo cáo",    Icon: BarChart3 },
  { abbr: "TB",  label: "Thông báo",  Icon: Bell },
  { abbr: "QĐ",  label: "Quyết định", Icon: CheckSquare },
  { abbr: "KH",  label: "Kế hoạch",   Icon: CalendarDays },
  { abbr: "BB",  label: "Biên bản",   Icon: ClipboardList },
  { abbr: "GM",  label: "Giấy mời",   Icon: UserPlus },
  { abbr: "HD",  label: "Hướng dẫn",  Icon: BookOpen },
];

function WelcomePanel({ onSelectTemplate, onSelectBlank, onSelectBlankWithContent, onGenerate, generating }: WelcomePanelProps) {
  const [activeTab, setActiveTab] = useState<"template" | "ai" | "blank">("template");
  const [yeuCau, setYeuCau] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    const maxSize = 20 * 1024 * 1024;
    if (file.size > maxSize) {
      alert("File quá lớn. Vui lòng chọn file nhỏ hơn 20MB.");
      return;
    }
    setUploadedFile(file);
  };

  const handleEnterBlank = async () => {
    if (!uploadedFile) {
      onSelectBlank();
      return;
    }

    setOcrProgress(0);
    setExtracting(true);
    try {
      // Bước 1: submit job
      const { data: job } = await ocrApi.extract(uploadedFile);

      // Bước 2: nếu đã done ngay thì dùng luôn
      if (job.status === "done") {
        setOcrProgress(100);
        const text = job.formatted_text || job.text || "";
        onSelectBlankWithContent(text, uploadedFile.name);
        ocrApi.remove(job.id).catch(() => {});
        return;
      }

      // Bước 3: poll đến khi done hoặc failed
      const MAX_WAIT_MS = 120_000; // 2 phút
      const INTERVAL_MS = 2_000;   // poll mỗi 2 giây
      const started = Date.now();

      await new Promise<void>((resolve, reject) => {
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

            // Cập nhật progress bar
            if (progressRes?.data?.percent != null) {
              setOcrProgress(Math.round(progressRes.data.percent));
            } else if (detail.status === "processing") {
              setOcrProgress((prev) => Math.min(prev + 10, 90));
            }

            if (detail.status === "done") {
              setOcrProgress(100);
              const text = detail.formatted_text || detail.text || "";
              onSelectBlankWithContent(text, uploadedFile.name);
              ocrApi.remove(job.id).catch(() => {});
              resolve();
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

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Lỗi xử lý file";
      if (msg === "Timeout") {
        alert("Xử lý file quá lâu. Vui lòng thử lại với file nhỏ hơn.");
      } else {
        alert(`Không thể xử lý file: ${msg}`);
      }
    } finally {
      setOcrProgress(0);
      setExtracting(false);
    }
  };

  const TABS: Array<{ id: "template" | "ai" | "blank"; Icon: LucideIcon; title: string; sub: string }> = [
    { id: "template", Icon: LayoutGrid, title: "Chọn template", sub: "Cấu trúc sẵn" },
    { id: "ai",       Icon: Sparkles,   title: "Tạo bằng AI",   sub: "AI soạn thảo" },
    { id: "blank",    Icon: FileText,   title: "Trang trắng",   sub: "Soạn tự do"   },
  ];

  return (
    <div className="h-full overflow-y-auto bg-[#e5e7eb] flex items-center justify-center py-8 px-4">
      <div className="bg-white rounded-2xl shadow-lg max-w-xl w-full mx-auto p-8">

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-teal-50 mb-3">
            <FileText className="h-6 w-6 text-teal-600" />
          </div>
          <h2 className="text-xl font-semibold text-slate-800">Bạn muốn bắt đầu như thế nào?</h2>
          <p className="text-sm text-muted-foreground mt-1">Chọn cách tạo văn bản phù hợp</p>
        </div>

        {/* Tab toggle buttons */}
        <div className="flex bg-slate-100 rounded-xl p-1 mb-4 gap-1">
          {TABS.map(({ id, Icon: TabIcon, title, sub }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={cn(
                "flex-1 flex flex-col items-center gap-1 py-2.5 px-2",
                "rounded-lg text-center transition-all duration-150",
                activeTab === id ? "bg-white shadow-sm" : "hover:bg-white/50"
              )}
            >
              <TabIcon className={cn("h-4 w-4", activeTab === id ? "text-teal-600" : "text-slate-400")} />
              <span className={cn("text-xs font-semibold", activeTab === id ? "text-teal-700" : "text-slate-500")}>{title}</span>
              <span className={cn("text-[10px]", activeTab === id ? "text-teal-500" : "text-muted-foreground")}>{sub}</span>
            </button>
          ))}
        </div>

        {/* Content: template */}
        {activeTab === "template" && (
          <div className="grid grid-cols-3 gap-2">
            {TEMPLATE_OPTIONS.map(({ abbr, label, Icon: CardIcon }) => (
              <button
                key={abbr}
                type="button"
                onClick={() => onSelectTemplate(abbr)}
                className="group flex flex-col items-center gap-1.5 p-3 rounded-xl border border-gray-200
                           hover:border-teal-400 hover:bg-teal-50 transition-all w-full"
              >
                <CardIcon className="h-5 w-5 text-slate-400 group-hover:text-teal-500" />
                <span className="text-[12px] font-medium text-slate-700 group-hover:text-teal-700">{label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Content: ai */}
        {activeTab === "ai" && (
          generating ? (
            <div className="flex flex-col items-center justify-center h-48 gap-4">
              <Loader2 className="h-12 w-12 animate-spin text-teal-600" />
              <p className="text-lg font-medium text-gray-700">AI đang soạn thảo...</p>
              <p className="text-sm text-gray-400">Thường mất 15–30 giây</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Mô tả văn bản cần tạo</p>
                <textarea
                  value={yeuCau}
                  onChange={(e) => setYeuCau(e.target.value)}
                  placeholder={"Mô tả văn bản bạn muốn tạo...\nVí dụ: Quyết định phê duyệt danh sách học sinh xuất sắc năm học 2025-2026"}
                  className="w-full h-32 resize-none border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  autoFocus
                />
              </div>
              <Button
                className="bg-teal-600 hover:bg-teal-700 text-white w-full"
                disabled={!yeuCau.trim()}
                onClick={() => onGenerate(yeuCau, "")}
              >
                Tạo văn bản
              </Button>
            </div>
          )
        )}

        {/* Content: blank */}
        {activeTab === "blank" && (
          <div className="space-y-4">

            {/* Vùng upload file — optional */}
            <div
              className={cn(
                "border-2 border-dashed rounded-xl p-5 text-center",
                "cursor-pointer transition-colors",
                uploadedFile
                  ? "border-teal-400 bg-teal-50"
                  : "border-gray-200 hover:border-teal-300"
              )}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const f = e.dataTransfer.files[0];
                if (f) handleFileSelect(f);
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileSelect(f);
                  e.target.value = "";
                }}
              />
              {uploadedFile ? (
                <div className="flex items-center justify-center gap-2">
                  <FileText className="h-5 w-5 text-teal-600" />
                  <span className="text-sm font-medium text-teal-700 truncate max-w-[200px]">
                    {uploadedFile.name}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setUploadedFile(null); }}
                    className="p-0.5 rounded hover:bg-teal-100 text-teal-400 hover:text-teal-600"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <>
                  <Upload className="h-7 w-7 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500 font-medium">
                    Kéo thả hoặc click để upload văn bản có sẵn
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    PDF, Word, JPG, PNG — tối đa 20MB
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Không bắt buộc — có thể bỏ qua để vào trang trắng
                  </p>
                </>
              )}
            </div>

            {/* Nút vào editor / progress bar */}
            {extracting ? (
              <div className="space-y-3">
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-teal-500 h-2.5 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${ocrProgress}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="h-3 w-3 animate-spin text-teal-500" />
                    Đang xử lý văn bản...
                  </span>
                  <span className="font-medium text-teal-600">{ocrProgress}%</span>
                </div>
                <p className="text-[11px] text-center text-muted-foreground">
                  Có thể mất 15–30 giây tùy kích thước file
                </p>
              </div>
            ) : (
              <Button
                onClick={handleEnterBlank}
                className="bg-teal-600 hover:bg-teal-700 text-white w-full"
              >
                {uploadedFile ? (
                  <>
                    <FileText className="h-4 w-4 mr-2" />
                    Mở văn bản để chỉnh sửa
                  </>
                ) : (
                  <>
                    <FilePlus2 className="h-4 w-4 mr-2" />
                    Vào editor trống
                  </>
                )}
              </Button>
            )}

          </div>
        )}

      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function hasContent(data: Nd30Data): boolean {
  return !!(
    data.noiDung.replace(/<[^>]*>/g, "").trim() ||
    data.trichYeu.trim() ||
    data.canCu.replace(/<[^>]*>/g, "").trim()
  );
}

// ── DocumentEditor ────────────────────────────────────────────────────────────

interface DocumentEditorProps {
  documentId?: string;
  initialContent?: string;
  initialTitle?: string;
  onAiReview?: (checkContent?: string) => void;
  editorMapRef?: React.MutableRefObject<Map<string, Editor>>;
  reviewChanges?: ReviewChange[];
  reviewSummary?: string;
  acceptedIds?: Set<number>;
  rejectedIds?: Set<number>;
  isReviewing?: boolean;
  onApplyChange?: (i: number) => void;
  onRejectChange?: (i: number) => void;
  onApplyAll?: () => void;
  onScrollToChange?: (change: ReviewChange) => void;
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

async function getUniqueTitle(baseTitle: string, docId?: string): Promise<string> {
  try {
    const res = await documentApi.list({ limit: 100 });
    const existing = res.items
      .filter((d) => d.id !== docId)
      .map((d) => d.title);

    if (!existing.includes(baseTitle)) return baseTitle;

    let n = 1;
    while (existing.includes(`${baseTitle} (${n})`)) n++;
    return `${baseTitle} (${n})`;
  } catch {
    return `${baseTitle} (${Date.now().toString().slice(-4)})`;
  }
}

function markdownToHtml(md: string): string {
  const processInline = (text: string) =>
    text
      .replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>");

  const blocks = md.split(/\n\n+/);

  const htmlBlocks = blocks.map(block => {
    block = block.trim();
    if (!block) return "";

    if (/^### /.test(block)) return `<h3>${processInline(block.slice(4))}</h3>`;
    if (/^## /.test(block))  return `<h2>${processInline(block.slice(3))}</h2>`;
    if (/^# /.test(block))   return `<h1>${processInline(block.slice(2))}</h1>`;

    const lines = block.split("\n");
    const isListBlock = lines.every(l =>
      /^\s*[-*+] /.test(l) || /^\s*\d+\. /.test(l) || !l.trim()
    );
    if (isListBlock) {
      const items = lines
        .filter(l => l.trim())
        .map(l => {
          const text = l.replace(/^\s*[-*+] /, "").replace(/^\s*\d+\. /, "");
          return `<li>${processInline(text)}</li>`;
        })
        .join("");
      return `<ul>${items}</ul>`;
    }

    if (block.startsWith("<")) return block;

    return lines
      .filter(l => l.trim())
      .map(l => `<p>${processInline(l)}</p>`)
      .join("");
  });

  return htmlBlocks.filter(Boolean).join("");
}

export function DocumentEditor({
  documentId, initialContent, initialTitle, onAiReview, editorMapRef,
  reviewChanges, reviewSummary, acceptedIds, rejectedIds, isReviewing,
  onApplyChange, onRejectChange, onApplyAll, onScrollToChange,
}: DocumentEditorProps) {
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
  const [isBlankMode, setIsBlankMode] = useState(false);
  const [blankInitialData, setBlankInitialData] = useState<Partial<Nd30Data> | null>(null);
  const searchParams = useSearchParams();
  const _parsed = parseContent(initialContent);
  const dataRef = useRef<Nd30Data>(
    { ...defaultNd30Data(_parsed.loaiVanBan ?? ""), ..._parsed }
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

  const onSelectTemplate = useCallback(async (abbr: string) => {
    const vbType = VAN_BAN_TYPES[abbr];
    const loaiLabel = vbType?.full_name ?? abbr;
    const newData = defaultNd30Data(abbr);
    dataRef.current = newData;
    const title = await getUniqueTitle(`${loaiLabel} không tiêu đề`, docId);
    setDocumentTitle(title);
    setIsBlankMode(false);
    setBlankInitialData(null);
    setGeneratedContent(newData);
    if (docId) {
      documentApi.update(docId, {
        title,
        loai_vb: abbr,
        content: JSON.stringify({ version: "nd30", ...newData }),
      }).catch(() => {});
    }
    setShowWelcome(false);
  }, [docId]);

  const onSelectBlank = useCallback(async () => {
    if (hasContent(dataRef.current)) {
      const ok = window.confirm(
        "Văn bản hiện tại có nội dung. Xóa trắng sẽ mất toàn bộ nội dung. Bạn có chắc không?"
      );
      if (!ok) return;
    }
    dataRef.current = { ...defaultNd30Data(""), loaiVanBan: "" };
    const title = await getUniqueTitle("Văn bản không tiêu đề", docId);
    setDocumentTitle(title);
    setIsBlankMode(true);
    setBlankInitialData(null);
    setGeneratedContent(null);
    setShowAiBanner(false);
    if (docId) {
      documentApi.update(docId, {
        title,
        content: JSON.stringify({ version: "nd30", ...dataRef.current }),
      }).catch(() => {});
    }
    setShowWelcome(false);
  }, [docId]);

  const onSelectBlankWithContent = useCallback(
    async (text: string, filename: string) => {
      if (hasContent(dataRef.current)) {
        const ok = window.confirm(
          "Văn bản hiện tại có nội dung. Tải lên sẽ thay thế toàn bộ. Bạn có chắc không?"
        );
        if (!ok) return;
      }

      const newData: Nd30Data = {
        ...defaultNd30Data(""),
        loaiVanBan: "",
        noiDung: `<p>${text
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .split("\n")
          .filter((l) => l.trim())
          .join("</p><p>")
        }</p>`,
      };
      dataRef.current = newData;
      setBlankInitialData(newData);
      const baseName = filename.replace(/\.[^/.]+$/, "").trim()
        || "Văn bản không tiêu đề";
      const title = await getUniqueTitle(baseName, docId);
      setDocumentTitle(title);
      setIsBlankMode(true);
      setGeneratedContent(null);
      setShowAiBanner(false);

      if (docId) {
        documentApi.update(docId, {
          title,
          content: JSON.stringify({ version: "nd30", ...newData }),
        }).catch(() => {});
      }
      setShowWelcome(false);
    },
    [docId]
  );

  const handleGenerate = useCallback(async (yeuCau: string, loai: string) => {
    if (!docId || !yeuCau.trim()) return;
    setGeneratingAi(true);
    try {
      await documentApi.generate({
        document_id: docId,
        loai_van_ban: loai || "CV",
        yeu_cau: yeuCau,
        source_ids: sourceIds,
      });
      const updated = await documentApi.get(docId);
      const parsedContent = parseContent(updated.content);
      dataRef.current = { ...defaultNd30Data(), ...parsedContent };
      const baseName = parsedContent.trichYeu
        ? parsedContent.trichYeu.slice(0, 50)
        : "Văn bản AI";
      const title = await getUniqueTitle(baseName, docId);
      setDocumentTitle(title);
      setIsBlankMode(false);
      setBlankInitialData(null);
      setGeneratedContent(parsedContent);
      setShowAiBanner(true);
      setShowWelcome(false);
    } catch {
      toast({ title: "Tạo văn bản thất bại", variant: "destructive" });
    } finally {
      setGeneratingAi(false);
    }
  }, [docId, sourceIds, toast]);

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
      if (editorMapRef?.current && editorMapRef.current.size > 0) {
        let targetEditor: Editor | null = null;

        editorMapRef.current.forEach((editor) => {
          if (editor.isFocused) targetEditor = editor;
        });

        if (!targetEditor) {
          targetEditor = editorMapRef.current.get("noiDung") ?? null;
        }

        if (!targetEditor) {
          targetEditor = editorMapRef.current.values().next().value ?? null;
        }

        if (targetEditor) {
          const html = markdownToHtml(text);
          (targetEditor as Editor).chain().focus().insertContent(html).run();
          toast({ title: "Đã chèn vào văn bản" });
          return;
        }
      }

      navigator.clipboard.writeText(text).then(() => {
        toast({
          title: "Đã copy vào clipboard",
          description: "Ctrl+V để dán vào vị trí cần chèn",
        });
      }).catch(() => {
        toast({ title: "Không thể copy", variant: "destructive" });
      });
    },
    [editorMapRef, toast]
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
            className="p-2 rounded-lg hover:bg-teal-50 text-slate-500 hover:text-teal-600 transition-colors"
            title="Quay lại danh sách"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          {/* Mobile toggle: sources */}
          <button
            onClick={() => { setShowLeft((v) => !v); setShowRight(false); }}
            className="lg:hidden p-1.5 rounded-md hover:bg-teal-50 text-slate-500 hover:text-teal-600"
            title="Tài liệu tham chiếu"
          >
            <PanelLeft className="h-4 w-4" />
          </button>
          {!editingTitle ? (
            <button
              onClick={() => setEditingTitle(true)}
              className="text-sm font-medium text-slate-700 hover:text-teal-700
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
              className="text-sm font-medium border-b border-teal-400
                         outline-none bg-transparent w-[250px]"
            />
          )}
          {!showWelcome && dataRef.current?.loaiVanBan && (
            <span className="hidden sm:inline-flex items-center px-2 py-0.5
                             rounded-full text-[11px] font-medium
                             bg-teal-50 text-teal-700 border border-teal-200">
              {dataRef.current.loaiVanBan}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <SaveIndicator status={status} label={statusLabel} />
          {/* Template / re-create button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowWelcome(true)}
            title="Thay đổi template hoặc tạo lại"
            className="text-slate-400 hover:text-teal-600 hover:bg-teal-50 hidden sm:flex"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
          </Button>
          <Button variant="outline" size="sm" onClick={enterPreview} title="Xem trước (Ctrl+Shift+P)" className="hover:border-teal-300 hover:text-teal-600 hover:bg-teal-50">
            <Eye className="h-3.5 w-3.5 mr-1.5" />
            Xem trước
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline" size="sm"
                disabled={exporting || !docId}
                title={!docId ? "Lưu trước" : "Tải xuống"}
                className="hover:border-teal-300 hover:text-teal-600 hover:bg-teal-50"
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
            className="bg-teal-600 hover:bg-teal-700 text-white"
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
            className="lg:hidden p-1.5 rounded-md hover:bg-teal-50 text-slate-500 hover:text-teal-600"
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
              onSelectTemplate={onSelectTemplate}
              onSelectBlank={onSelectBlank}
              onSelectBlankWithContent={onSelectBlankWithContent}
              onGenerate={handleGenerate}
              generating={generatingAi}
            />
          ) : (
            <Nd30Document
              key={
                isBlankMode
                  ? (blankInitialData ? "blank-content" : "blank")
                  : generatedContent ? "generated" : "initial"
              }
              initialData={
                isBlankMode
                  ? (blankInitialData
                      ? { ...defaultNd30Data(""), ...blankInitialData }
                      : { ...defaultNd30Data(""), loaiVanBan: "" })
                  : generatedContent
                    ? { ...defaultNd30Data(), ...generatedContent }
                    : { ...defaultNd30Data(), ...parseContent(initialContent) }
              }
              onChange={handleChange}
              isNew={!isBlankMode && !generatedContent && wasNewDoc.current}
              editorMapRef={editorMapRef}
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
                onAiReview={onAiReview ?? (() => {})}
                reviewChanges={reviewChanges}
                reviewSummary={reviewSummary}
                acceptedIds={acceptedIds}
                rejectedIds={rejectedIds}
                isReviewing={isReviewing}
                onApplyChange={onApplyChange}
                onRejectChange={onRejectChange}
                onApplyAll={onApplyAll}
                onScrollToChange={onScrollToChange}
              />
            </div>
          </>
        )}

      </div>
    </div>
  );
}
