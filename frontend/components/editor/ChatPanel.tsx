"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { X, Trash2, SendHorizonal, Bot, Loader2 } from "lucide-react";
import { chatApi, type ChatCitation } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: ChatCitation[];
  isStreaming?: boolean;
  timestamp: Date;
}

export interface ChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  docId: string;
  getDocContext: () => string;
  onInsertText: (text: string) => void;
}

const QUICK_PROMPTS = [
  { emoji: "📋", label: "Tìm căn cứ pháp lý" },
  { emoji: "✍️", label: "Gợi ý trích yếu" },
  { emoji: "🔍", label: "Kiểm tra thể thức NĐ30" },
  { emoji: "📖", label: "Tóm tắt nội dung" },
];

export function ChatPanel({ isOpen, onClose, docId, getDocContext, onInsertText }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Load history when panel opens
  useEffect(() => {
    if (!isOpen) return;
    chatApi
      .getHistory(docId)
      .then((res) => {
        if (res.history.length > 0) {
          setMessages(
            res.history.map((h, i) => ({
              id: `history-${i}`,
              role: h.role,
              content: h.content,
              timestamp: new Date(),
            }))
          );
        }
      })
      .catch(() => {});
  }, [isOpen, docId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || isStreaming) return;

    const query = input.trim();
    const now = Date.now();
    const userMsgId = `user-${now}`;
    const asstMsgId = `asst-${now + 1}`;

    setMessages((prev) => [
      ...prev,
      { id: userMsgId, role: "user", content: query, timestamp: new Date() },
      { id: asstMsgId, role: "assistant", content: "", isStreaming: true, timestamp: new Date() },
    ]);
    setInput("");
    setIsStreaming(true);

    const docContext = getDocContext();

    try {
      await chatApi.streamChat(
        query,
        docId,
        docContext || undefined,
        (token) => {
          setMessages((prev) =>
            prev.map((m) => (m.id === asstMsgId ? { ...m, content: m.content + token } : m))
          );
          scrollToBottom();
        },
        (citations) => {
          setMessages((prev) =>
            prev.map((m) => (m.id === asstMsgId ? { ...m, citations } : m))
          );
        },
        () => {
          setMessages((prev) =>
            prev.map((m) => (m.id === asstMsgId ? { ...m, isStreaming: false } : m))
          );
          setIsStreaming(false);
        },
        (error) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === asstMsgId ? { ...m, content: `Lỗi: ${error}`, isStreaming: false } : m
            )
          );
          setIsStreaming(false);
          toast({ title: "Lỗi chat", description: error, variant: "destructive" });
        }
      );
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === asstMsgId ? { ...m, content: "Đã xảy ra lỗi kết nối.", isStreaming: false } : m
        )
      );
      setIsStreaming(false);
    }
  }, [input, isStreaming, docId, getDocContext, scrollToBottom, toast]);

  const handleClearHistory = useCallback(async () => {
    try {
      await chatApi.clearHistory(docId);
      setMessages([]);
      toast({ title: "Đã xóa lịch sử hội thoại" });
    } catch {
      toast({ title: "Xóa thất bại", variant: "destructive" });
    }
  }, [docId, toast]);

  return (
    <div
      className={`fixed right-0 top-0 h-full w-[380px] bg-white dark:bg-gray-900 border-l shadow-xl z-40 flex flex-col transform transition-transform duration-300 ${
        isOpen ? "translate-x-0" : "translate-x-full"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-blue-500" />
          <span className="font-semibold text-sm">Trợ lý AI</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleClearHistory}
            title="Xóa lịch sử"
            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-red-500 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <button
            onClick={onClose}
            title="Đóng"
            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 min-h-0">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center text-sm text-gray-400 gap-3 py-8">
            <Bot className="h-12 w-12 text-gray-200" />
            <p className="leading-relaxed">
              Hỏi về căn cứ pháp lý,<br />thể thức NĐ30, thủ tục hành chính...
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex mb-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                msg.role === "user"
                  ? "bg-blue-500 text-white rounded-tr-sm"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-tl-sm"
              }`}
            >
              {msg.isStreaming ? (
                <>
                  <span className="whitespace-pre-wrap">{msg.content}</span>
                  <span className="inline-flex gap-1 ml-1 items-center">
                    {[0, 150, 300].map((delay) => (
                      <span
                        key={delay}
                        className="inline-block w-1 h-1 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: `${delay}ms` }}
                      />
                    ))}
                  </span>
                </>
              ) : (
                <span className="whitespace-pre-wrap">{msg.content}</span>
              )}

              {/* Citations mini cards */}
              {msg.citations && msg.citations.length > 0 && (
                <div className="mt-2 space-y-1">
                  {msg.citations.map((c, i) => (
                    <div
                      key={i}
                      className="text-xs bg-white dark:bg-gray-700 rounded px-2 py-1 border border-gray-200 dark:border-gray-600"
                    >
                      <span className="font-medium text-blue-600">[{i + 1}]</span>{" "}
                      {c.so_ki_hieu || c.document_title || "—"}
                      {c.dieu_khoan && (
                        <span className="text-gray-500"> · {c.dieu_khoan}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Insert into document button */}
              {!msg.isStreaming && msg.role === "assistant" && msg.content && (
                <button
                  onClick={() => onInsertText(msg.content)}
                  className="mt-2 text-xs text-blue-500 hover:text-blue-700 flex items-center gap-1 transition-colors"
                >
                  ↩ Chèn vào văn bản
                </button>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick prompt chips */}
      <div className="flex flex-wrap gap-1 px-3 pb-2 shrink-0">
        {QUICK_PROMPTS.map((p) => (
          <button
            key={p.label}
            onClick={() => {
              setInput(p.label);
              inputRef.current?.focus();
            }}
            disabled={isStreaming}
            className="text-xs px-2 py-1 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            {p.emoji} {p.label}
          </button>
        ))}
      </div>

      {/* Input area */}
      <div className="flex gap-2 p-3 border-t shrink-0">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && e.ctrlKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Hỏi về văn bản... (Ctrl+Enter)"
          disabled={isStreaming}
          rows={2}
          className="flex-1 resize-none text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
        />
        <button
          onClick={handleSend}
          disabled={isStreaming || !input.trim()}
          title="Gửi (Ctrl+Enter)"
          className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors self-end"
        >
          {isStreaming ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <SendHorizonal className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  );
}
