"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Bot, Trash2, SendHorizonal, Loader2, Wrench,
  CheckSquare, Sparkles, FileSearch, AlignLeft, ShieldCheck,
  ChevronLeft, Clock, Check, X, LayoutGrid,
} from "lucide-react";
import { chatApi, type ChatCitation, type ReviewChange } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: ChatCitation[];
  isStreaming?: boolean;
}

interface ToolTask {
  id: string;
  toolId: string;
  label: string;
  timestamp: Date;
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
  | "nd30" | "citation" | "template" | "compare";

interface Tool {
  id: ToolId;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
}

const TOOLS: Tool[] = [
  { id: "review",   label: "Rà soát văn bản",    Icon: ShieldCheck },
  { id: "summarize",label: "Tóm tắt nội dung",    Icon: AlignLeft   },
  { id: "qa",       label: "Hỏi đáp nội dung",    Icon: Bot         },
  { id: "table",    label: "Bảng số liệu",         Icon: LayoutGrid  },
  { id: "draft",    label: "Soạn thảo nhanh",      Icon: Sparkles    },
  { id: "nd30",     label: "Kiểm tra định dạng",   Icon: CheckSquare },
  { id: "citation", label: "Trích dẫn điều khoản", Icon: FileSearch  },
  { id: "template", label: "Tạo mẫu văn bản",      Icon: AlignLeft   },
  { id: "compare",  label: "So sánh văn bản",       Icon: Wrench      },
];

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

// ── TemplatePanelContent ──────────────────────────────────────────────────────

const TEMPLATE_TYPES = [
  "Công văn", "Tờ trình", "Báo cáo", "Thông báo",
  "Quyết định", "Kế hoạch", "Biên bản", "Giấy mời",
];

function TemplatePanelContent({
  onGenerate,
  isStreaming,
}: {
  onGenerate: (loai: string) => void;
  isStreaming: boolean;
}) {
  return (
    <div className="flex flex-col p-3 gap-3">
      <p className="text-xs text-gray-500 leading-relaxed">
        Chọn loại văn bản để tạo mẫu theo thể thức NĐ30. Kết quả hiển thị trong tab Chat AI.
      </p>
      <div className="grid grid-cols-2 gap-2">
        {TEMPLATE_TYPES.map((loai) => (
          <button
            key={loai}
            type="button"
            onClick={() => onGenerate(loai)}
            disabled={isStreaming}
            className="flex items-center justify-center px-2 py-3 rounded-xl border border-gray-100 hover:border-teal-200 hover:bg-teal-50 text-xs font-medium text-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loai}
          </button>
        ))}
      </div>
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  // Auto-switch to review panel when results arrive
  useEffect(() => {
    if (reviewChanges.length > 0 || isReviewing) {
      setActiveTool("review");
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

  const addTask = useCallback(
    (toolId: ToolId) => {
      const tool = TOOLS.find((t) => t.id === toolId);
      if (!tool) return;
      setTasks((prev) => [
        { id: `${toolId}-${Date.now()}`, toolId, label: tool.label, timestamp: new Date() },
        ...prev.slice(0, 9),
      ]);
    },
    []
  );

  // Add task history entry after review completes
  useEffect(() => {
    if (reviewChanges.length > 0 && !isReviewing) {
      addTask("review");
    }
  }, [reviewChanges, isReviewing, addTask]);

  const sendMessage = useCallback(
    async (query: string) => {
      if (!query.trim() || isStreaming) return;
      const now = Date.now();
      const userMsgId = `u-${now}`;
      const asstMsgId = `a-${now + 1}`;

      setMessages((prev) => [
        ...prev,
        { id: userMsgId, role: "user", content: query },
        { id: asstMsgId, role: "assistant", content: "", isStreaming: true },
      ]);
      setInput("");
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
            toast({ title: "Lỗi chat", description: error, variant: "destructive" });
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
    [docId, getDocContext, isStreaming, sourceIds, toast]
  );

  const handleGenerateTemplate = useCallback(
    (loai: string) => {
      if (isStreaming) {
        toast({ title: "Đang xử lý, vui lòng đợi" });
        return;
      }
      sendMessage(
        `Tạo mẫu ${loai} theo đúng thể thức quy định tại NĐ30/2020/NĐ-CP. ` +
        `Trình bày đầy đủ các phần: quốc hiệu, tiêu ngữ, tên cơ quan, số/ký hiệu, ` +
        `địa danh ngày tháng, tên loại và trích yếu, nội dung chính, nơi nhận, ký tên.`
      );
      addTask("template");
    },
    [isStreaming, sendMessage, addTask, toast]
  );

  const handleGenerateTable = useCallback(() => {
    if (isStreaming) {
      toast({ title: "Đang xử lý, vui lòng đợi" });
      return;
    }
    const content = getDocContext();
    sendMessage(
      `Đọc nội dung sau và trích xuất toàn bộ số liệu, thống kê, dữ liệu định lượng có trong văn bản. ` +
      `Tổng hợp thành bảng markdown với cột Nội dung và Số liệu. ` +
      `Nếu không có số liệu thì nêu rõ. Văn bản: ${content}`
    );
    addTask("table");
  }, [isStreaming, getDocContext, sendMessage, addTask, toast]);

  const handleGenerateDraft = useCallback(() => {
    if (isStreaming) {
      toast({ title: "Đang xử lý, vui lòng đợi" });
      return;
    }
    const content = getDocContext();
    sendMessage(
      `Dựa trên nội dung văn bản hành chính sau, hãy gợi ý đoạn nội dung tiếp theo phù hợp thể thức và văn phong hành chính. ` +
      `Gợi ý khoảng 3 đến 5 câu, súc tích, đúng văn phong công vụ. Văn bản hiện tại: ${content}`
    );
    addTask("draft");
  }, [isStreaming, getDocContext, sendMessage, addTask, toast]);

  const handleGenerateCompare = useCallback((_sourceId: string) => {
    if (isStreaming) {
      toast({ title: "Đang xử lý, vui lòng đợi" });
      return;
    }
    sendMessage(
      `So sánh văn bản hiện tại với tài liệu tham chiếu đã chọn. ` +
      `Nêu rõ những điểm khác nhau về nội dung, thời hạn, yêu cầu hoặc quy định. ` +
      `Trình bày dạng danh sách rõ ràng.`
    );
    addTask("compare");
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
        setActiveTool("review");
        onAiReview();
        break;
      case "summarize":
        sendMessage("Tóm tắt nội dung chính của văn bản đang soạn thảo trong 3-5 câu.");
        addTask("summarize");
        break;
      case "nd30":
        sendMessage(
          "Kiểm tra thể thức văn bản này theo NĐ30/2020/NĐ-CP. Liệt kê những điểm chưa đúng (nếu có)."
        );
        addTask("nd30");
        break;
      case "citation":
        sendMessage(
          "Gợi ý các căn cứ pháp lý phù hợp cho văn bản đang soạn thảo. Liệt kê số/ký hiệu, tên văn bản cụ thể."
        );
        addTask("citation");
        break;
      case "qa":
        setActiveTab("chat");
        break;
      case "template":
        setActiveTool("template");
        break;
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
      case "summarize":
      case "nd30":
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
      case "template":
        return (
          <TemplatePanelContent
            onGenerate={handleGenerateTemplate}
            isStreaming={isStreaming}
          />
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
                <Wrench className="h-3.5 w-3.5" />
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

      {/* Tab: Tools */}
      {activeTab === "tools" &&
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
            <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide mb-2">
              Công cụ AI
            </p>

            <div className="grid grid-cols-3 gap-2 mb-4">
              {TOOLS.map((tool) => (
                <button
                  key={tool.id}
                  type="button"
                  onClick={() => handleToolClick(tool.id)}
                  className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl border border-gray-100 hover:border-teal-300 hover:bg-teal-50/50 transition-colors text-center group"
                >
                  <div className="p-2 rounded-lg bg-gray-100 text-gray-500 group-hover:bg-teal-100 group-hover:text-teal-600 transition-colors">
                    <tool.Icon className="h-4 w-4" />
                  </div>
                  <span className="text-[11px] font-medium text-gray-700 leading-tight">
                    {tool.label}
                  </span>
                </button>
              ))}
            </div>

            {/* Task history */}
            {tasks.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Clock className="h-3 w-3 text-teal-400" />
                  <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">
                    Gần đây
                  </p>
                </div>
                <div className="space-y-1">
                  {tasks.map((task) => (
                    <button
                      key={task.id}
                      onClick={() => setActiveTool(task.toolId as ToolId)}
                      className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-teal-50/50 transition-colors text-left"
                    >
                      <span className="text-xs text-gray-600">{task.label}</span>
                      <span className="text-[10px] text-gray-400">
                        {formatRelativeTime(task.timestamp)}
                      </span>
                    </button>
                  ))}
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
      {activeTab === "chat" && (
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
                  {msg.isStreaming ? (
                    <>
                      <span className="whitespace-pre-wrap">{msg.content}</span>
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
                  ) : (
                    <span className="whitespace-pre-wrap">{msg.content}</span>
                  )}

                  {msg.citations && msg.citations.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {msg.citations.map((c, i) => (
                        <div
                          key={i}
                          className="text-xs bg-white rounded px-2 py-1 border border-gray-200"
                        >
                          <span className="font-medium text-teal-600">[{i + 1}]</span>{" "}
                          {c.so_ki_hieu || c.document_title || "—"}
                        </div>
                      ))}
                    </div>
                  )}

                  {!msg.isStreaming && msg.role === "assistant" && msg.content && (
                    <button
                      onClick={() => onInsertText(msg.content)}
                      className="mt-1.5 text-xs text-teal-400 hover:text-teal-600 flex items-center gap-1"
                    >
                      ↩ Chèn vào văn bản
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

          <div className="flex gap-2 p-3 border-t shrink-0">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.ctrlKey) {
                    e.preventDefault();
                    sendMessage(input);
                  }
                }}
                placeholder="Hỏi về văn bản... (Ctrl+Enter)"
                disabled={isStreaming}
                rows={2}
                className="w-full resize-none text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50"
              />
            </div>
            <div className="flex flex-col gap-1 justify-end">
              <button
                onClick={handleClearHistory}
                title="Xóa lịch sử"
                className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-400 hover:text-red-500 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => sendMessage(input)}
                disabled={isStreaming || !input.trim()}
                className="p-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-40 transition-colors"
              >
                {isStreaming ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <SendHorizonal className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
