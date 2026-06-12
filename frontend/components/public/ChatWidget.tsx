"use client";

import { useState, useEffect, useRef } from "react";
import { MessageCircle, X, Send, Bot, Download } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Citation {
  document_title: string | null;
  so_ki_hieu: string | null;
  dieu_khoan?: string | null;
  score: number;
  content_preview?: string | null;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  formName?: string;
  formFile?: string;
}

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const WELCOME: Message = {
  role: "assistant",
  content:
    "Xin chào! Tôi là trợ lý AI của CivicAI.\nTôi có thể giúp bạn tra cứu thủ tục hành chính, tìm hiểu các quy định pháp luật.\nBạn muốn hỏi gì?",
};

function genSessionId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [sessionId] = useState(genSessionId);
  const [citationModal, setCitationModal] = useState<null | {
    title: string;
    content: string;
    score?: number;
    dieu_khoan?: string;
  }>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const isOpenRef = useRef(false);

  useEffect(() => {
    isOpenRef.current = isOpen;
    if (isOpen) {
      setUnreadCount(0);
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    const query = input.trim();
    if (!query || isLoading) return;

    setInput("");
    setIsLoading(true);
    setMessages((prev) => [
      ...prev,
      { role: "user", content: query },
      { role: "assistant", content: "" },
    ]);

    try {
      const res = await fetch(`${BASE_URL}/api/v1/public/chat/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, session_id: sessionId }),
      });

      if (!res.ok) {
        const msg =
          res.status === 429
            ? "Quá nhiều yêu cầu. Vui lòng thử lại sau."
            : "Lỗi kết nối đến hệ thống.";
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = { role: "assistant", content: msg };
          return next;
        });
        return;
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6);
          if (raw === "[DONE]") break;
          try {
            const evt = JSON.parse(raw);
            if (evt.type === "token") {
              setMessages((prev) => {
                const next = [...prev];
                next[next.length - 1] = {
                  ...next[next.length - 1],
                  content: next[next.length - 1].content + evt.content,
                };
                return next;
              });
            } else if (evt.type === "citations") {
              setMessages((prev) => {
                const next = [...prev];
                next[next.length - 1] = {
                  ...next[next.length - 1],
                  citations: evt.data,
                };
                return next;
              });
            } else if (evt.type === "error") {
              setMessages((prev) => {
                const next = [...prev];
                next[next.length - 1] = {
                  role: "assistant",
                  content: "Xin lỗi, đã xảy ra lỗi. Vui lòng thử lại.",
                };
                return next;
              });
            }
          } catch {}
        }
      }

      if (!isOpenRef.current) setUnreadCount((c) => c + 1);

      // Detect form sau khi stream xong
      try {
        const detectRes = await fetch(`${BASE_URL}/api/v1/forms/detect-form`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query }),
        });
        const detectData = await detectRes.json() as {
          form_name: string | null;
          form_file: string | null;
        };
        if (detectData.form_name && detectData.form_file) {
          setMessages((prev) => {
            const next = [...prev];
            next[next.length - 1] = {
              ...next[next.length - 1],
              formName: detectData.form_name!,
              formFile: detectData.form_file!,
            };
            return next;
          });
        }
      } catch {}
    } catch {
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = {
          role: "assistant",
          content: "Không thể kết nối đến hệ thống. Vui lòng thử lại sau.",
        };
        return next;
      });
    } finally {
      setIsLoading(false);
    }
  };

  const downloadForm = (formFile: string, formName: string) => {
    const url = `${BASE_URL}/api/v1/forms/download?file=${encodeURIComponent(formFile)}`;
    const a = document.createElement("a");
    a.href = url;
    const safe = formName.replace(/[^\w\s-]/g, "").replace(/\s+/g, "_");
    a.download = `Mau_${safe}.docx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Chat panel */}
      <div
        className={[
          "fixed bottom-20 right-4 z-50 flex flex-col bg-white rounded-2xl shadow-2xl border border-gray-200",
          "transition-all duration-300 ease-out",
          "w-[380px] max-[440px]:w-[calc(100vw-2rem)] max-[440px]:right-4 max-[440px]:left-4",
          isOpen
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 translate-y-6 pointer-events-none",
        ].join(" ")}
        style={{ height: "500px" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-teal-600 rounded-t-2xl shrink-0">
          <div className="flex items-center gap-2 text-white">
            <Bot className="h-5 w-5 shrink-0" />
            <span className="font-semibold text-sm">Trợ lý CivicAI</span>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="text-white/80 hover:text-white transition-colors p-0.5 rounded"
            aria-label="Đóng"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div className="max-w-[85%]">
                <div
                  className={[
                    "rounded-2xl px-3 py-2 text-sm leading-relaxed",
                    msg.role === "user"
                      ? "bg-teal-600 text-white rounded-br-sm whitespace-pre-wrap"
                      : "bg-teal-50 border border-teal-100 text-gray-800 rounded-bl-sm",
                  ].join(" ")}
                >
                  {msg.role === "user" ? (
                    msg.content
                  ) : (
                    <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0 prose-headings:my-1">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                    </div>
                  )}
                  {/* Typing indicator */}
                  {msg.role === "assistant" &&
                    isLoading &&
                    i === messages.length - 1 &&
                    msg.content === "" && (
                      <span className="inline-flex gap-1 items-center py-0.5">
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
                      </span>
                    )}
                </div>

                {/* Citations */}
                {(() => {
                  const raw = msg.citations ?? [];
                  const unique = raw.filter((c, idx, arr) =>
                    arr.findIndex(x =>
                      (x.so_ki_hieu && x.so_ki_hieu === c.so_ki_hieu) ||
                      (x.document_title && x.document_title === c.document_title)
                    ) === idx
                  );
                  if (unique.length === 0) return null;
                  return (
                    <div className="mt-2 flex flex-wrap items-center gap-1">
                      <span className="text-[10px] text-slate-400">Nguồn:</span>
                      {unique.map((c, i) => (
                        <button
                          key={i}
                          onClick={() => setCitationModal({
                            title: c.so_ki_hieu || c.document_title || `Nguồn ${i + 1}`,
                            content: c.content_preview || "",
                            score: c.score,
                            dieu_khoan: c.dieu_khoan ?? undefined,
                          })}
                          className="text-[11px] text-teal-600 hover:text-teal-800 hover:underline underline-offset-2 font-medium transition-colors"
                        >
                          {c.so_ki_hieu || c.document_title || `Nguồn ${i + 1}`}
                          {i < unique.length - 1 && (
                            <span className="text-slate-300 ml-1">,</span>
                          )}
                        </button>
                      ))}
                    </div>
                  );
                })()}

                {/* Download form button */}
                {msg.role === "assistant" && !isLoading && msg.formName && msg.formFile && (
                  <button
                    onClick={() => downloadForm(msg.formFile!, msg.formName!)}
                    className="mt-2 flex items-center gap-1.5 text-xs bg-teal-600 hover:bg-teal-700 text-white rounded-lg px-3 py-1.5 transition-colors font-medium"
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

        {/* Input */}
        <div className="border-t border-gray-100 p-3 flex gap-2 items-end shrink-0">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Nhập câu hỏi... (Enter để gửi)"
            disabled={isLoading}
            rows={1}
            className="flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:opacity-50 max-h-24 leading-snug"
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
            className="shrink-0 w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center hover:bg-teal-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Gửi"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Citation modal */}
      {citationModal && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          onClick={() => setCitationModal(null)}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[70vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between p-4 border-b shrink-0">
              <div className="flex-1 min-w-0 pr-3">
                <p className="text-sm font-semibold text-slate-800 leading-tight">
                  {citationModal.title}
                </p>
                {citationModal.dieu_khoan && (
                  <p className="text-xs text-slate-500 mt-0.5">
                    {citationModal.dieu_khoan}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {citationModal.score !== undefined && (
                  <span className="text-[10px] bg-teal-50 text-teal-600 border border-teal-200 rounded-full px-2 py-0.5">
                    {Math.round(citationModal.score * 100)}% khớp
                  </span>
                )}
                <button
                  onClick={() => setCitationModal(null)}
                  className="p-1 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="bg-teal-50/40 border border-teal-100 rounded-xl p-4">
                <p className="text-xs font-semibold text-teal-700 uppercase tracking-wide mb-3">
                  Nội dung trích dẫn
                </p>
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {citationModal.content || "Không có nội dung xem trước."}
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="p-3 border-t shrink-0">
              <button
                onClick={() => setCitationModal(null)}
                className="w-full py-2 text-sm text-teal-600 hover:text-teal-700 rounded-lg border border-teal-200 hover:bg-teal-50 transition-colors font-medium"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating toggle button */}
      <button
        onClick={() => setIsOpen((o) => !o)}
        className="fixed bottom-4 right-4 z-50 w-14 h-14 rounded-full bg-teal-600 text-white shadow-lg hover:bg-teal-700 transition-all duration-200 flex items-center justify-center hover:scale-105 active:scale-95"
        aria-label="Mở trợ lý AI"
      >
        {isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <MessageCircle className="h-6 w-6" />
        )}
        {!isOpen && unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
    </>
  );
}
