"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Bot, Trash2, SendHorizonal, Loader2, Wrench,
  CheckSquare, Sparkles, FileSearch, AlignLeft, ShieldCheck,
} from "lucide-react";
import { chatApi, type ChatCitation } from "@/lib/api";
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

export interface RightPanelProps {
  docId: string;
  getDocContext: () => string;
  onInsertText: (text: string) => void;
  sourceIds: string[];
  onAiReview: () => void;
}

const QUICK_PROMPTS = [
  { emoji: "📋", label: "Tìm căn cứ pháp lý" },
  { emoji: "✍️", label: "Gợi ý trích yếu" },
  { emoji: "🔍", label: "Kiểm tra thể thức NĐ30" },
  { emoji: "📖", label: "Tóm tắt nội dung" },
];

// ── Tool card ─────────────────────────────────────────────────────────────────

function ToolCard({
  icon, label, description, onClick, loading,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  onClick: () => void;
  loading?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="w-full text-left flex items-start gap-3 p-3 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50 transition-colors group disabled:opacity-50"
    >
      <div className="p-2 rounded-lg bg-blue-100 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors shrink-0">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      </div>
      <div>
        <p className="text-sm font-medium text-gray-800">{label}</p>
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
      </div>
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function RightPanel({
  docId, getDocContext, onInsertText, sourceIds, onAiReview,
}: RightPanelProps) {
  const [activeTab, setActiveTab] = useState<"tools" | "chat">("tools");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [checkLoading, setCheckLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  // Load chat history on mount
  useEffect(() => {
    if (!docId || docId === "new-doc") return;
    chatApi.getHistory(docId)
      .then((res) => {
        if (res.history.length > 0) {
          setMessages(res.history.map((h, i) => ({
            id: `h-${i}`, role: h.role, content: h.content,
          })));
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

  const sendMessage = useCallback(async (query: string) => {
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
        query, docId, getDocContext() || undefined,
        (token) => setMessages((prev) =>
          prev.map((m) => m.id === asstMsgId ? { ...m, content: m.content + token } : m)
        ),
        (citations) => setMessages((prev) =>
          prev.map((m) => m.id === asstMsgId ? { ...m, citations } : m)
        ),
        () => {
          setMessages((prev) =>
            prev.map((m) => m.id === asstMsgId ? { ...m, isStreaming: false } : m)
          );
          setIsStreaming(false);
        },
        (error) => {
          setMessages((prev) =>
            prev.map((m) => m.id === asstMsgId
              ? { ...m, content: `Lỗi: ${error}`, isStreaming: false } : m)
          );
          setIsStreaming(false);
          toast({ title: "Lỗi chat", description: error, variant: "destructive" });
        },
        sourceIds,
      );
    } catch {
      setMessages((prev) =>
        prev.map((m) => m.id === asstMsgId
          ? { ...m, content: "Lỗi kết nối.", isStreaming: false } : m)
      );
      setIsStreaming(false);
    }
  }, [docId, getDocContext, isStreaming, sourceIds, toast]);

  const handleClearHistory = async () => {
    try {
      await chatApi.clearHistory(docId);
      setMessages([]);
    } catch {
      toast({ title: "Xóa thất bại", variant: "destructive" });
    }
  };

  const handleCheckND30 = async () => {
    setCheckLoading(true);
    await sendMessage("Kiểm tra thể thức văn bản này theo NĐ30/2020/NĐ-CP. Liệt kê những điểm chưa đúng (nếu có).");
    setCheckLoading(false);
  };

  const handleSummarize = async () => {
    setSummaryLoading(true);
    await sendMessage("Tóm tắt nội dung chính của văn bản đang soạn thảo trong 3-5 câu.");
    setSummaryLoading(false);
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
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            )}
          >
            {tab === "tools"
              ? <><Wrench className="h-3.5 w-3.5" />Công cụ</>
              : <><Bot className="h-3.5 w-3.5" />Chat AI
                  {messages.length > 0 && (
                    <span className="ml-1 bg-blue-600 text-white text-[10px] rounded-full px-1.5 py-0.5 font-bold">
                      {Math.ceil(messages.length / 2)}
                    </span>
                  )}
                </>
            }
          </button>
        ))}
      </div>

      {/* Tab: Tools */}
      {activeTab === "tools" && (
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-3">
            Trợ lý soạn thảo
          </p>
          <ToolCard
            icon={<CheckSquare className="h-4 w-4" />}
            label="Kiểm tra NĐ30"
            description="Phát hiện lỗi thể thức, bố cục văn bản"
            onClick={handleCheckND30}
            loading={checkLoading}
          />
          <ToolCard
            icon={<FileSearch className="h-4 w-4" />}
            label="Gợi ý căn cứ pháp lý"
            description="Tìm văn bản liên quan từ kho tài liệu"
            onClick={() => sendMessage("Gợi ý các căn cứ pháp lý phù hợp cho văn bản đang soạn thảo. Liệt kê số/ký hiệu, tên văn bản cụ thể.")}
          />
          <ToolCard
            icon={<Sparkles className="h-4 w-4" />}
            label="Gợi ý trích yếu"
            description="AI đề xuất trích yếu phù hợp loại văn bản"
            onClick={() => sendMessage("Đề xuất 3 mẫu trích yếu ngắn gọn, phù hợp với loại và nội dung văn bản đang soạn thảo.")}
          />
          <ToolCard
            icon={<AlignLeft className="h-4 w-4" />}
            label="Tóm tắt nội dung"
            description="Tóm tắt văn bản đang soạn trong 3-5 câu"
            onClick={handleSummarize}
            loading={summaryLoading}
          />
          <ToolCard
            icon={<ShieldCheck className="h-4 w-4" />}
            label="Rà soát văn bản"
            description="AI kiểm tra chính tả, thể thức NĐ30, văn phong"
            onClick={onAiReview}
          />

          {sourceIds.length > 0 && (
            <div className="mt-4 pt-3 border-t">
              <p className="text-[10px] text-blue-600 font-medium">
                ✓ Chat đang tìm trong {sourceIds.length} tài liệu đã ghim
              </p>
            </div>
          )}
        </div>
      )}

      {/* Tab: Chat */}
      {activeTab === "chat" && (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 min-h-0 space-y-3">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center text-xs text-gray-400 gap-3 py-8">
                <Bot className="h-10 w-10 text-gray-200" />
                <p className="leading-relaxed">
                  Hỏi về căn cứ pháp lý,<br />thể thức NĐ30, thủ tục hành chính...
                </p>
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div className={cn(
                  "max-w-[88%] rounded-2xl px-3 py-2 text-sm",
                  msg.role === "user"
                    ? "bg-blue-600 text-white rounded-tr-sm"
                    : "bg-gray-100 text-gray-900 rounded-tl-sm"
                )}>
                  {msg.isStreaming ? (
                    <>
                      <span className="whitespace-pre-wrap">{msg.content}</span>
                      <span className="inline-flex gap-1 ml-1">
                        {[0, 150, 300].map((d) => (
                          <span key={d} className="inline-block w-1 h-1 bg-gray-400 rounded-full animate-bounce"
                            style={{ animationDelay: `${d}ms` }} />
                        ))}
                      </span>
                    </>
                  ) : (
                    <span className="whitespace-pre-wrap">{msg.content}</span>
                  )}

                  {msg.citations && msg.citations.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {msg.citations.map((c, i) => (
                        <div key={i} className="text-xs bg-white rounded px-2 py-1 border border-gray-200">
                          <span className="font-medium text-blue-600">[{i + 1}]</span>{" "}
                          {c.so_ki_hieu || c.document_title || "—"}
                        </div>
                      ))}
                    </div>
                  )}

                  {!msg.isStreaming && msg.role === "assistant" && msg.content && (
                    <button
                      onClick={() => onInsertText(msg.content)}
                      className="mt-1.5 text-xs text-blue-400 hover:text-blue-600 flex items-center gap-1"
                    >
                      ↩ Chèn vào văn bản
                    </button>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick prompts */}
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

          {/* Input */}
          <div className="flex gap-2 p-3 border-t shrink-0">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.ctrlKey) { e.preventDefault(); sendMessage(input); }
                }}
                placeholder="Hỏi về văn bản... (Ctrl+Enter)"
                disabled={isStreaming}
                rows={2}
                className="w-full resize-none text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
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
                className="p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors"
              >
                {isStreaming
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <SendHorizonal className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
