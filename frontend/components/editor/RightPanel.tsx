"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Bot, Trash2, SendHorizonal, Loader2, Wrench,
  CheckSquare, Sparkles, FileSearch, AlignLeft, ShieldCheck,
  ChevronLeft, Clock, Check, X, LayoutGrid, AlertCircle, Download,
  PenLine, GitCompare, Mic,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { chatApi, formApi, type ChatCitation, type ReviewChange } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  displayLabel?: string;
  citations?: ChatCitation[];
  isStreaming?: boolean;
  formName?: string;
  formFile?: string;
}

interface ToolTask {
  id: string;
  toolId: string;
  label: string;
  timestamp: Date;
  messageId?: string;
}

export interface RightPanelProps {
  docId: string;
  getDocContext: () => string;
  onInsertText: (text: string) => void;
  sourceIds: string[];
  onAiReview: () => void;
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

// ── Constants ─────────────────────────────────────────────────────────────────

const BADGE_COLOR: Record<string, string> = {
  chinh_ta: "bg-red-100 text-red-700",
  the_thuc: "bg-purple-100 text-purple-700",
  van_phong: "bg-teal-100 text-teal-700",
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

const QUICK_PROMPTS = [
  { emoji: "📋", label: "Tìm căn cứ pháp lý" },
  { emoji: "✍️", label: "Gợi ý trích yếu" },
  { emoji: "🔍", label: "Kiểm tra thể thức NĐ30" },
  { emoji: "📖", label: "Tóm tắt nội dung" },
];

type ToolId =
  | "review" | "summarize" | "qa" | "table" | "draft"
  | "nd30" | "citation" | "style" | "compare";

interface Tool {
  id: ToolId;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  color: "teal" | "blue" | "amber" | "slate";
  description: string;
}

const TOOLS: Tool[] = [
  { id: "review",   label: "Rà soát",        Icon: ShieldCheck, color: "teal",  description: "Phát hiện lỗi và đề xuất sửa trực tiếp" },
  { id: "nd30",     label: "Chuẩn thể thức",  Icon: CheckSquare, color: "teal",  description: "Kiểm tra và sửa theo chuẩn Nghị định 30" },
  { id: "style",    label: "Chuẩn văn phong", Icon: PenLine,     color: "teal",  description: "Đồng bộ văn phong hành chính toàn văn bản" },
  { id: "summarize",label: "Tóm tắt",         Icon: AlignLeft,   color: "blue",  description: "Tóm tắt nội dung chính 3-5 câu" },
  { id: "table",    label: "Bảng số liệu",    Icon: LayoutGrid,  color: "blue",  description: "Trích xuất số liệu thành bảng" },
  { id: "draft",    label: "Gợi ý tiếp",      Icon: Sparkles,    color: "blue",  description: "Gợi ý đoạn nội dung tiếp theo" },
  { id: "citation", label: "Căn cứ pháp lý",  Icon: FileSearch,  color: "blue",  description: "Tìm căn cứ pháp lý phù hợp" },
  { id: "compare",  label: "So sánh",          Icon: GitCompare,  color: "amber", description: "So sánh với tài liệu tham chiếu" },
  { id: "qa",       label: "Hỏi đáp",          Icon: Bot,         color: "slate", description: "Hỏi AI về nội dung văn bản" },
];

type ToolColor = "teal" | "blue" | "amber" | "slate";

const TOOL_COLORS: Record<ToolColor, {
  active: string; hover: string; icon: string; iconDefault: string; iconHover: string; label: string;
}> = {
  teal: {
    active:      "border-teal-500 bg-teal-50",
    hover:       "hover:border-teal-300 hover:bg-teal-50/50",
    icon:        "text-teal-600",
    iconDefault: "text-teal-400",
    iconHover:   "group-hover:text-teal-500",
    label:       "text-teal-700",
  },
  blue: {
    active:      "border-blue-500 bg-blue-50",
    hover:       "hover:border-blue-300 hover:bg-blue-50/50",
    icon:        "text-blue-600",
    iconDefault: "text-blue-400",
    iconHover:   "group-hover:text-blue-500",
    label:       "text-blue-700",
  },
  amber: {
    active:      "border-amber-500 bg-amber-50",
    hover:       "hover:border-amber-300 hover:bg-amber-50/50",
    icon:        "text-amber-600",
    iconDefault: "text-amber-400",
    iconHover:   "group-hover:text-amber-500",
    label:       "text-amber-700",
  },
  slate: {
    active:      "border-slate-500 bg-slate-50",
    hover:       "hover:border-slate-300 hover:bg-slate-50/50",
    icon:        "text-slate-600",
    iconDefault: "text-slate-400",
    iconHover:   "group-hover:text-slate-500",
    label:       "text-slate-700",
  },
};

const LABEL_DEFAULT: Record<ToolColor, string> = {
  teal:  "text-teal-500",
  blue:  "text-blue-500",
  amber: "text-amber-500",
  slate: "text-slate-500",
};

const BORDER_DEFAULT: Record<ToolColor, string> = {
  teal:  "border-teal-100",
  blue:  "border-blue-100",
  amber: "border-amber-100",
  slate: "border-slate-100",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatRelativeTime(date: Date): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return "Vừa xong";
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  return `${Math.floor(diff / 86400)} ngày trước`;
}

// ── ReviewPanelContent ────────────────────────────────────────────────────────

function ReviewPanelContent({
  reviewChanges = [],
  reviewSummary = "",
  acceptedIds = new Set<number>(),
  rejectedIds = new Set<number>(),
  isReviewing = false,
  onApplyChange,
  onRejectChange,
  onApplyAll,
  onScrollToChange,
}: {
  reviewChanges?: ReviewChange[];
  reviewSummary?: string;
  acceptedIds?: Set<number>;
  rejectedIds?: Set<number>;
  isReviewing?: boolean;
  onApplyChange?: (i: number) => void;
  onRejectChange?: (i: number) => void;
  onApplyAll?: () => void;
  onScrollToChange?: (change: ReviewChange) => void;
}) {
  const pendingCount = reviewChanges.filter(
    (_, i) => !acceptedIds.has(i) && !rejectedIds.has(i)
  ).length;

  if (isReviewing) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
        <p className="text-sm text-violet-700 font-medium">Đang rà soát văn bản...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Stats bar */}
      {reviewChanges.length > 0 && (
        <div className="px-3 py-2 border-b shrink-0 space-y-1.5">
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
        </div>
      )}

      {reviewSummary && (
        <div className="px-3 py-2 border-b shrink-0">
          <p className="text-xs text-green-800 bg-green-50 border border-green-200 rounded-lg p-2 leading-relaxed">
            {reviewSummary}
          </p>
        </div>
      )}

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
              className={cn(
                "border rounded-lg p-3 space-y-2 text-xs transition-opacity",
                (accepted || rejected) ? "opacity-50" : "",
                accepted ? "border-green-200 bg-green-50/30" : "",
                rejected ? "border-red-200 bg-red-50/30" : "",
              )}
            >
              <div className="flex items-center gap-1 flex-wrap">
                <span
                  className={cn(
                    "inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded",
                    BADGE_COLOR[change.type] ?? "bg-gray-100 text-gray-700"
                  )}
                >
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

              <div className="space-y-1">
                <div
                  className="line-through text-red-600 bg-red-50 px-2 py-1 rounded leading-relaxed break-words cursor-pointer hover:bg-red-100 transition-colors"
                  onClick={() => onScrollToChange?.(change)}
                  title="Click để tìm trong văn bản"
                >
                  {change.original}
                </div>
                <div className="text-green-700 bg-green-50 px-2 py-1 rounded leading-relaxed break-words">
                  {change.revised}
                </div>
              </div>

              {change.reason && (
                <p className="text-[11px] text-muted-foreground leading-relaxed">{change.reason}</p>
              )}

              {!accepted && !rejected && (
                <div className="flex gap-1.5 pt-0.5">
                  <button
                    onClick={() => onApplyChange?.(i)}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md bg-teal-50 text-teal-600 hover:bg-teal-100 text-[11px] font-medium transition-colors border border-teal-200"
                  >
                    <Check className="h-3 w-3" /> Áp dụng
                  </button>
                  <button
                    onClick={() => onRejectChange?.(i)}
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

      {pendingCount > 0 && (
        <div className="px-3 py-2 border-t shrink-0">
          <button
            onClick={onApplyAll}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 transition-colors"
          >
            <Check className="h-3.5 w-3.5" />
            Áp dụng tất cả ({pendingCount})
          </button>
        </div>
      )}
    </div>
  );
}

// ── TablePanelContent ─────────────────────────────────────────────────────────

function TablePanelContent({
  onGenerate,
  isStreaming,
}: {
  onGenerate: () => void;
  isStreaming: boolean;
}) {
  return (
    <div className="flex flex-col p-3 gap-3">
      <p className="text-xs text-gray-500 leading-relaxed">
        Trích xuất và tổng hợp số liệu từ văn bản hiện tại thành bảng markdown.
      </p>
      <button
        type="button"
        onClick={onGenerate}
        disabled={isStreaming}
        className="flex items-center justify-center gap-2 px-3 py-3 rounded-xl bg-teal-600 text-white text-xs font-medium hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <LayoutGrid className="h-3.5 w-3.5" />
        Lập bảng số liệu
      </button>
    </div>
  );
}

// ── DraftPanelContent ─────────────────────────────────────────────────────────

function DraftPanelContent({
  onGenerate,
  isStreaming,
}: {
  onGenerate: () => void;
  isStreaming: boolean;
}) {
  return (
    <div className="flex flex-col p-3 gap-3">
      <p className="text-xs text-gray-500 leading-relaxed">
        Gợi ý đoạn văn tiếp theo phù hợp thể thức và văn phong hành chính.
      </p>
      <button
        type="button"
        onClick={onGenerate}
        disabled={isStreaming}
        className="flex items-center justify-center gap-2 px-3 py-3 rounded-xl bg-teal-600 text-white text-xs font-medium hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Sparkles className="h-3.5 w-3.5" />
        Gợi ý nội dung tiếp theo
      </button>
    </div>
  );
}

// ── ComparePanelContent ───────────────────────────────────────────────────────

function ComparePanelContent({
  sourceIds,
  onGenerate,
  isStreaming,
}: {
  sourceIds: string[];
  onGenerate: (sourceId: string) => void;
  isStreaming: boolean;
}) {
  const [selectedId, setSelectedId] = useState<string>("");

  if (sourceIds.length === 0) {
    return (
      <div className="flex flex-col p-3 gap-3">
        <p className="text-xs text-gray-500 leading-relaxed">
          So sánh văn bản hiện tại với một tài liệu tham chiếu đã ghim.
        </p>
        <p className="text-xs text-amber-600 bg-amber-50 rounded-lg p-2 border border-amber-100">
          Chưa ghim tài liệu tham chiếu nào. Hãy ghim tài liệu trong tab Nguồn.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col p-3 gap-3">
      <p className="text-xs text-gray-500 leading-relaxed">
        So sánh văn bản hiện tại với một tài liệu tham chiếu đã ghim.
      </p>
      <div className="flex flex-col gap-1.5">
        {sourceIds.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setSelectedId(id)}
            className={cn(
              "text-left px-2 py-2 rounded-lg border text-xs transition-colors",
              selectedId === id
                ? "border-teal-400 bg-teal-50 text-teal-700 font-medium"
                : "border-gray-100 hover:border-teal-200 hover:bg-gray-50 text-gray-600"
            )}
          >
            {id.length > 30 ? `${id.slice(0, 30)}…` : id}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => selectedId && onGenerate(selectedId)}
        disabled={!selectedId || isStreaming}
        className="flex items-center justify-center gap-2 px-3 py-3 rounded-xl bg-teal-600 text-white text-xs font-medium hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Wrench className="h-3.5 w-3.5" />
        So sánh
      </button>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function RightPanel({
  docId, getDocContext, onInsertText, sourceIds, onAiReview,
  reviewChanges = [], reviewSummary = "",
  acceptedIds = new Set<number>(), rejectedIds = new Set<number>(),
  isReviewing = false,
  onApplyChange, onRejectChange, onApplyAll, onScrollToChange,
}: RightPanelProps) {
  const [activeTab, setActiveTab] = useState<"tools" | "chat">("tools");
  const [activeTool, setActiveTool] = useState<ToolId | null>(null);
  const [tasks, setTasks] = useState<ToolTask[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [viewingCitation, setViewingCitation] = useState<ChatCitation | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);
  // Tracks which review-type tool triggered the current review session
  const pendingReviewToolRef = useRef<"review" | "nd30">("review");
  const { toast } = useToast();

  // Auto-switch to the correct review panel when results arrive
  useEffect(() => {
    if (reviewChanges.length > 0 || isReviewing) {
      setActiveTool(pendingReviewToolRef.current);
      setActiveTab("tools");
    }
  }, [reviewChanges.length, isReviewing]);

  // Load chat history on mount
  useEffect(() => {
    if (!docId || docId === "new-doc") return;
    chatApi
      .getHistory(docId)
      .then((res) => {
        if (res.history.length > 0) {
          setMessages(
            res.history.map((h, i) => ({ id: `h-${i}`, role: h.role, content: h.content }))
          );
        }
      })
      .catch(() => {});
  }, [docId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (activeTab === "chat") {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [activeTab]);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.lang = "vi-VN";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput((prev) => prev + (prev.trim() ? " " : "") + transcript);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
    setSpeechSupported(true);
  }, []);

  const addTask = useCallback(
    (toolId: ToolId, messageId?: string) => {
      const tool = TOOLS.find((t) => t.id === toolId);
      if (!tool) return;
      setTasks((prev) => [
        { id: `${toolId}-${Date.now()}`, toolId, label: tool.label, timestamp: new Date(), messageId },
        ...prev.slice(0, 9),
      ]);
    },
    []
  );

  const handleToggleMic = useCallback(() => {
    if (!recognitionRef.current || isStreaming) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try { recognitionRef.current.start(); setIsListening(true); } catch {}
    }
  }, [isListening, isStreaming]);

  // Add task history entry after review completes
  useEffect(() => {
    if (reviewChanges.length > 0 && !isReviewing) {
      addTask(pendingReviewToolRef.current);
    }
  }, [reviewChanges, isReviewing, addTask]);

  const sendMessage = useCallback(
    async (query: string, displayLabel?: string, targetMsgId?: string) => {
      if (!query.trim() || isStreaming) return;
      const now = Date.now();
      const userMsgId = `u-${now}`;
      const asstMsgId = targetMsgId ?? `a-${now + 1}`;

      setMessages((prev) => [
        ...prev,
        { id: userMsgId, role: "user", content: query, displayLabel },
        { id: asstMsgId, role: "assistant", content: "", isStreaming: true },
      ]);
      setInput("");
      if (inputRef.current) inputRef.current.style.height = "auto";
      setIsStreaming(true);
      setActiveTab("chat");

      try {
        await chatApi.streamChat(
          query,
          docId,
          getDocContext() || undefined,
          (token) =>
            setMessages((prev) =>
              prev.map((m) =>
                m.id === asstMsgId ? { ...m, content: m.content + token } : m
              )
            ),
          (citations) =>
            setMessages((prev) =>
              prev.map((m) => (m.id === asstMsgId ? { ...m, citations } : m))
            ),
          () => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === asstMsgId ? { ...m, isStreaming: false } : m
              )
            );
            setIsStreaming(false);
            formApi.detect(query).then((result) => {
              if (result.form_name && result.form_file) {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === asstMsgId
                      ? { ...m, formName: result.form_name!, formFile: result.form_file! }
                      : m
                  )
                );
              }
            }).catch(() => {});
          },
          (error) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === asstMsgId
                  ? { ...m, content: `Lỗi: ${error}`, isStreaming: false }
                  : m
              )
            );
            setIsStreaming(false);
          },
          sourceIds
        );
      } catch {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === asstMsgId ? { ...m, content: "Lỗi kết nối.", isStreaming: false } : m
          )
        );
        setIsStreaming(false);
      }
    },
    [docId, getDocContext, isStreaming, sourceIds]
  );

  const handleGenerateTable = useCallback(() => {
    if (isStreaming) {
      toast({ title: "Đang xử lý, vui lòng đợi" });
      return;
    }
    const now = Date.now();
    const asstMsgId = `a-${now + 1}`;
    addTask("table", asstMsgId);
    const content = getDocContext();
    sendMessage(
      `Đọc nội dung sau và trích xuất toàn bộ số liệu, thống kê, dữ liệu định lượng có trong văn bản. ` +
      `Tổng hợp thành bảng markdown với cột Nội dung và Số liệu. ` +
      `Nếu không có số liệu thì nêu rõ. Văn bản: ${content}`,
      "Lập bảng số liệu",
      asstMsgId
    );
  }, [isStreaming, getDocContext, sendMessage, addTask, toast]);

  const handleGenerateDraft = useCallback(() => {
    if (isStreaming) {
      toast({ title: "Đang xử lý, vui lòng đợi" });
      return;
    }
    const now = Date.now();
    const asstMsgId = `a-${now + 1}`;
    addTask("draft", asstMsgId);
    const content = getDocContext();
    sendMessage(
      `Dựa trên nội dung văn bản hành chính sau, hãy gợi ý đoạn nội dung tiếp theo phù hợp thể thức và văn phong hành chính. ` +
      `Gợi ý khoảng 3 đến 5 câu, súc tích, đúng văn phong công vụ. Văn bản hiện tại: ${content}`,
      "Soạn thảo nhanh",
      asstMsgId
    );
  }, [isStreaming, getDocContext, sendMessage, addTask, toast]);

  const handleGenerateCompare = useCallback((_sourceId: string) => {
    if (isStreaming) {
      toast({ title: "Đang xử lý, vui lòng đợi" });
      return;
    }
    const now = Date.now();
    const asstMsgId = `a-${now + 1}`;
    addTask("compare", asstMsgId);
    sendMessage(
      `So sánh văn bản hiện tại với tài liệu tham chiếu đã chọn. ` +
      `Nêu rõ những điểm khác nhau về nội dung, thời hạn, yêu cầu hoặc quy định. ` +
      `Trình bày dạng danh sách rõ ràng.`,
      "So sánh văn bản",
      asstMsgId
    );
  }, [isStreaming, sendMessage, addTask, toast]);

  const handleClearHistory = async () => {
    try {
      await chatApi.clearHistory(docId);
      setMessages([]);
    } catch {
      toast({ title: "Xóa thất bại", variant: "destructive" });
    }
  };

  const handleToolClick = (toolId: ToolId) => {
    switch (toolId) {
      case "review":
        pendingReviewToolRef.current = "review";
        setActiveTool("review");
        onAiReview();
        break;
      case "nd30":
        pendingReviewToolRef.current = "nd30";
        setActiveTool("nd30");
        onAiReview();
        break;
      case "style": {
        if (isStreaming) { toast({ title: "Đang xử lý, vui lòng đợi" }); return; }
        const styleNow = Date.now();
        const styleAsstId = `a-${styleNow + 1}`;
        addTask("style", styleAsstId);
        sendMessage(
          "Đọc toàn bộ văn bản sau và chuẩn hóa văn phong " +
          "thành văn phong hành chính công vụ chuẩn mực: " +
          "câu văn súc tích, không dùng từ thông tục, " +
          "đúng cấu trúc câu văn hành chính, " +
          "thống nhất xưng hô và cách dùng từ. " +
          "Trả về toàn bộ văn bản đã chuẩn hóa.",
          "Chuẩn văn phong",
          styleAsstId
        );
        break;
      }
      case "summarize": {
        const sumNow = Date.now();
        const sumAsstId = `a-${sumNow + 1}`;
        addTask("summarize", sumAsstId);
        sendMessage("Tóm tắt nội dung chính của văn bản đang soạn thảo trong 3-5 câu.", "Tóm tắt nội dung", sumAsstId);
        break;
      }
      case "citation": {
        const citNow = Date.now();
        const citAsstId = `a-${citNow + 1}`;
        addTask("citation", citAsstId);
        sendMessage(
          "Gợi ý các căn cứ pháp lý phù hợp cho văn bản đang soạn thảo. Liệt kê số/ký hiệu, tên văn bản cụ thể.",
          "Trích dẫn điều khoản",
          citAsstId
        );
        break;
      }
      case "qa": {
        const lastAssistantMsg = [...messages]
          .reverse()
          .find((m) => m.role === "assistant" && !m.isStreaming);
        if (lastAssistantMsg && activeTool) {
          addTask(activeTool as ToolId);
        }
        setMessages([]);
        setActiveTool(null);
        setActiveTab("chat");
        break;
      }
      case "table":
        setActiveTool("table");
        break;
      case "draft":
        setActiveTool("draft");
        break;
      case "compare":
        setActiveTool("compare");
        break;
    }
  };

  const renderToolPanel = () => {
    switch (activeTool) {
      case "review":
      case "nd30":
        return (
          <ReviewPanelContent
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
        );
      case "style":
        return (
          <div className="flex flex-col p-3 gap-3">
            <p className="text-xs text-gray-500 leading-relaxed">
              Chuẩn hóa văn phong toàn bộ văn bản về văn phong hành chính công vụ chuẩn mực.
              Kết quả hiển thị trong tab Chat AI,
              dùng nút Chèn vào văn bản để áp dụng.
            </p>
            <button
              type="button"
              onClick={() => handleToolClick("style")}
              disabled={isStreaming}
              className="flex items-center justify-center gap-2 px-3 py-3 rounded-xl bg-teal-600 text-white text-xs font-medium hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <PenLine className="h-3.5 w-3.5" />
              Chuẩn hóa văn phong
            </button>
          </div>
        );
      case "summarize":
      case "citation":
        return (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-400 text-sm p-4 text-center">
            <Bot className="h-8 w-8 text-gray-200" />
            <p>Kết quả đã gửi vào tab Chat AI</p>
            <button
              onClick={() => setActiveTab("chat")}
              className="text-xs text-teal-600 hover:underline mt-1"
            >
              Xem Chat →
            </button>
          </div>
        );
      case "table":
        return <TablePanelContent onGenerate={handleGenerateTable} isStreaming={isStreaming} />;
      case "draft":
        return <DraftPanelContent onGenerate={handleGenerateDraft} isStreaming={isStreaming} />;
      case "compare":
        return (
          <ComparePanelContent
            sourceIds={sourceIds}
            onGenerate={handleGenerateCompare}
            isStreaming={isStreaming}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full bg-white border-l">
      {/* Tab bar */}
      <div className="flex border-b shrink-0">
        {(["tools", "chat"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium border-b-2 transition-colors",
              activeTab === tab
                ? "border-teal-500 text-teal-600"
                : "border-transparent text-slate-500 hover:text-teal-500 hover:border-teal-200"
            )}
          >
            {tab === "tools" ? (
              <>
                <CheckSquare className="h-3.5 w-3.5" />
                Công cụ
              </>
            ) : (
              <>
                <Bot className="h-3.5 w-3.5" />
                Chat AI
                {messages.length > 0 && (
                  <span className="ml-1 bg-teal-600 text-white text-[10px] rounded-full px-1.5 py-0.5 font-bold">
                    {Math.ceil(messages.length / 2)}
                  </span>
                )}
              </>
            )}
          </button>
        ))}
      </div>

      {/* Citation viewer */}
      {viewingCitation && (
        <div className="flex flex-col h-full">
          <div className="flex items-center gap-2 px-3 py-2.5 border-b bg-white shrink-0">
            <button
              onClick={() => setViewingCitation(null)}
              className="p-1 rounded-md hover:bg-teal-50 text-slate-500 hover:text-teal-600 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate">
                {viewingCitation.so_ki_hieu ||
                 viewingCitation.document_title ||
                 "Tài liệu tham chiếu"}
              </p>
              {viewingCitation.dieu_khoan && (
                <p className="text-xs text-muted-foreground truncate">
                  {viewingCitation.dieu_khoan}
                </p>
              )}
            </div>
            <span className="text-[10px] bg-teal-50 text-teal-600 border border-teal-200 rounded-full px-2 py-0.5 shrink-0">
              {Math.round(viewingCitation.score * 100)}% khớp
            </span>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <div className="bg-teal-50/40 border border-teal-100 rounded-xl p-4">
              <p className="text-xs font-semibold text-teal-700 uppercase tracking-wide mb-3">
                Nội dung trích dẫn
              </p>
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                {viewingCitation.content_preview || "Không có nội dung xem trước."}
              </p>
            </div>
            <button
              onClick={() => setViewingCitation(null)}
              className="mt-4 w-full text-sm text-teal-600 hover:text-teal-700 py-2 rounded-lg border border-teal-200 hover:bg-teal-50 transition-colors"
            >
              ← Quay lại chat
            </button>
          </div>
        </div>
      )}

      {/* Tab: Tools */}
      {!viewingCitation && activeTab === "tools" &&
        (activeTool ? (
          /* Per-tool panel */
          <div className="flex flex-col h-full min-h-0">
            <div className="flex items-center gap-2 px-3 py-2.5 border-b shrink-0 bg-gray-50">
              <button
                onClick={() => setActiveTool(null)}
                className="p-1 rounded-md hover:bg-gray-200 text-gray-500 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm font-medium text-gray-700">
                {TOOLS.find((t) => t.id === activeTool)?.label ?? activeTool}
              </span>
            </div>
            <div className="flex-1 min-h-0">{renderToolPanel()}</div>
          </div>
        ) : (
          /* Tool grid + history */
          <div className="flex-1 overflow-y-auto p-3">
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-2 px-0.5">
              Công cụ AI
            </p>

            <div className="grid grid-cols-3 gap-2 mb-4">
              {TOOLS.map((tool) => {
                const colors = TOOL_COLORS[tool.color];
                return (
                  <button
                    key={tool.id}
                    type="button"
                    onClick={() => handleToolClick(tool.id)}
                    title={tool.description}
                    className={cn(
                      "relative flex flex-col items-center gap-1.5 p-3",
                      "rounded-xl border bg-white cursor-pointer",
                      "transition-all duration-150 text-center group",
                      activeTool === tool.id
                        ? `${colors.active} shadow-sm`
                        : `${BORDER_DEFAULT[tool.color]} ${colors.hover} hover:shadow-sm`
                    )}
                  >
                    <tool.Icon
                      className={cn(
                        "h-5 w-5 transition-colors",
                        activeTool === tool.id
                          ? colors.icon
                          : colors.iconDefault
                      )}
                    />
                    <span
                      className={cn(
                        "text-[11px] leading-tight text-center",
                        activeTool === tool.id
                          ? `${colors.label} font-medium`
                          : LABEL_DEFAULT[tool.color]
                      )}
                    >
                      {tool.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Task history */}
            {tasks.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-1 px-0.5">
                  <Clock className="h-3 w-3 text-teal-400" />
                  <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                    Gần đây
                  </p>
                </div>
                <div className="space-y-0.5">
                  {tasks.map((task) => {
                    const tool = TOOLS.find((t) => t.id === task.toolId);
                    const ToolIcon = tool?.Icon ?? Clock;
                    const color: ToolColor = (tool?.color as ToolColor) ?? "slate";
                    return (
                      <button
                        key={task.id}
                        onClick={() => {
                          const chatTools = ["summarize", "nd30", "citation", "table", "draft", "style", "compare", "qa"];
                          if (chatTools.includes(task.toolId)) {
                            setActiveTab("chat");
                            setActiveTool(null);
                            if (task.messageId) {
                              setTimeout(() => {
                                const el = messageRefs.current.get(task.messageId!);
                                el?.scrollIntoView({ behavior: "smooth", block: "start" });
                              }, 100);
                            }
                          } else {
                            setActiveTool(task.toolId as ToolId);
                          }
                        }}
                        className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-teal-50/50 transition-colors text-left cursor-pointer"
                      >
                        <div
                          className={cn(
                            "rounded-md p-1 shrink-0",
                            color === "teal"  && "bg-teal-50",
                            color === "blue"  && "bg-blue-50",
                            color === "amber" && "bg-amber-50",
                            color === "slate" && "bg-slate-100",
                          )}
                        >
                          <ToolIcon
                            className={cn(
                              "h-3 w-3",
                              color === "teal"  && "text-teal-500",
                              color === "blue"  && "text-blue-500",
                              color === "amber" && "text-amber-500",
                              color === "slate" && "text-slate-500",
                            )}
                          />
                        </div>
                        <span className="text-xs text-slate-600 flex-1 truncate">{task.label}</span>
                        <span className="text-[10px] text-gray-400 shrink-0">
                          {formatRelativeTime(task.timestamp)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {sourceIds.length > 0 && (
              <div className="mt-4 pt-3 border-t">
                <p className="text-[10px] text-teal-600 font-medium">
                  ✓ Chat đang tìm trong {sourceIds.length} tài liệu đã ghim
                </p>
              </div>
            )}
          </div>
        ))}

      {/* Tab: Chat */}
      {!viewingCitation && activeTab === "chat" && (
        <>
          <div className="flex-1 overflow-y-auto px-3 py-3 min-h-0 space-y-3">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center text-xs text-gray-400 gap-3 py-8">
                <Bot className="h-10 w-10 text-gray-200" />
                <p className="leading-relaxed">
                  Hỏi về căn cứ pháp lý,
                  <br />
                  thể thức NĐ30, thủ tục hành chính...
                </p>
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                ref={(el) => {
                  if (el) messageRefs.current.set(msg.id, el);
                  else messageRefs.current.delete(msg.id);
                }}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={cn(
                    "max-w-[88%] rounded-2xl px-3 py-2 text-sm",
                    msg.role === "user"
                      ? "bg-slate-100 text-slate-800 rounded-tr-sm"
                      : "bg-teal-50 border border-teal-100 text-slate-800 rounded-tl-sm"
                  )}
                >
                  {msg.role === "user" ? (
                    <span className="whitespace-pre-wrap text-sm">
                      {msg.displayLabel ?? msg.content}
                    </span>
                  ) : msg.isStreaming ? (
                    <>
                      <span className="whitespace-pre-wrap text-sm">{msg.content}</span>
                      <span className="inline-flex gap-1 ml-1">
                        {[0, 150, 300].map((d) => (
                          <span
                            key={d}
                            className="inline-block w-1 h-1 bg-gray-400 rounded-full animate-bounce"
                            style={{ animationDelay: `${d}ms` }}
                          />
                        ))}
                      </span>
                    </>
                  ) : msg.content.startsWith("Lỗi:") ? (
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                      <p className="text-sm text-amber-700">{msg.content.replace("Lỗi: ", "")}</p>
                    </div>
                  ) : (
                    <div className="chat-markdown text-sm text-slate-800">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          p: ({ children }) => (
                            <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>
                          ),
                          br: () => <br />,
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  )}

                  {msg.citations && msg.citations.length > 0 && (() => {
                    const uniqueCitations = msg.citations.filter(
                      (c, idx, arr) =>
                        arr.findIndex(
                          (x) =>
                            (x.so_ki_hieu && x.so_ki_hieu === c.so_ki_hieu) ||
                            (x.document_title && x.document_title === c.document_title)
                        ) === idx
                    );
                    return (
                      <div className="mt-2 flex flex-wrap items-center gap-1">
                        <span className="text-[10px] text-slate-400">Nguồn:</span>
                        {uniqueCitations.map((c, i) => (
                          <button
                            key={i}
                            onClick={() => setViewingCitation(c)}
                            className="text-[11px] text-teal-600 hover:text-teal-800 hover:underline underline-offset-2 font-medium transition-colors"
                          >
                            {c.so_ki_hieu || c.document_title || `Nguồn ${i + 1}`}
                            {i < uniqueCitations.length - 1 && (
                              <span className="text-slate-300 ml-1 no-underline">,</span>
                            )}
                          </button>
                        ))}
                      </div>
                    );
                  })()}

                  {!msg.isStreaming && msg.role === "assistant" && msg.content && !msg.content.startsWith("Lỗi:") && (
                    <button
                      onClick={() => {
                        const cleanText = msg.content
                          .replace(/\[\d+\]/g, "")
                          .replace(/\s+\n/g, "\n")
                          .trim();
                        onInsertText(cleanText);
                      }}
                      className="mt-1.5 text-xs text-teal-400 hover:text-teal-600 flex items-center gap-1"
                    >
                      ↩ Chèn vào văn bản
                    </button>
                  )}

                  {!msg.isStreaming && msg.role === "assistant" && msg.formName && msg.formFile && (
                    <button
                      onClick={() => {
                        const a = document.createElement("a");
                        a.href = formApi.downloadUrl(msg.formFile!);
                        const safe = msg.formName!.replace(/[^\w\s-]/g, "").replace(/\s+/g, "_");
                        a.download = `Mau_${safe}.docx`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                      }}
                      className="mt-1.5 flex items-center gap-1.5 text-xs bg-teal-600 hover:bg-teal-700 text-white rounded-lg px-3 py-1.5 transition-colors font-medium w-fit"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Tải {msg.formName}
                    </button>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="flex flex-wrap gap-1 px-3 pb-1.5 shrink-0">
            {QUICK_PROMPTS.map((p) => (
              <button
                key={p.label}
                onClick={() => sendMessage(p.label)}
                disabled={isStreaming}
                className="text-xs px-2 py-1 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-50 whitespace-nowrap"
              >
                {p.emoji} {p.label}
              </button>
            ))}
          </div>

          <div className="p-3 border-t shrink-0">
            <div className={cn(
              "relative rounded-2xl border bg-background flex items-end p-1.5",
              "focus-within:ring-2 focus-within:ring-teal-500/20 focus-within:border-teal-400 transition-shadow"
            )}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage(input);
                  }
                }}
                placeholder="Nhập câu hỏi... (Shift+Enter để xuống hàng)"
                disabled={isStreaming}
                rows={2}
                className="flex-1 resize-none border-0 bg-transparent focus:outline-none focus:ring-0 px-2 py-1.5 max-h-[120px] overflow-y-auto text-sm disabled:opacity-50"
              />
              <div className="flex flex-col gap-0.5 mb-0.5 mr-0.5">
                <button onClick={handleClearHistory} title="Xóa lịch sử"
                  className="h-7 w-7 rounded-full flex items-center justify-center border border-gray-200 hover:bg-gray-50 text-gray-400 hover:text-red-500 transition-colors">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
                {speechSupported && (
                  <button type="button" onClick={handleToggleMic} disabled={isStreaming}
                    title={isListening ? "Đang nghe..." : "Nhập bằng giọng nói"}
                    className={cn(
                      "h-7 w-7 rounded-full flex items-center justify-center border transition-colors",
                      isListening
                        ? "border-red-200 bg-red-50 text-red-600 animate-pulse"
                        : "border-gray-200 hover:bg-gray-50 text-gray-400 hover:text-gray-600"
                    )}>
                    <Mic className="h-3.5 w-3.5" />
                  </button>
                )}
                <button onClick={() => sendMessage(input)} disabled={isStreaming || !input.trim()}
                  className={cn(
                    "h-7 w-7 rounded-full flex items-center justify-center transition-colors",
                    input.trim() && !isStreaming
                      ? "bg-teal-600 text-white hover:bg-teal-700"
                      : "bg-gray-100 text-gray-400 cursor-not-allowed"
                  )}>
                  {isStreaming
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <SendHorizonal className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
