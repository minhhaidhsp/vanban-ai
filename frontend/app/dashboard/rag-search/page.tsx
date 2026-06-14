"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle, ArrowUp, BookOpen, Mic, Sparkles, Wifi, WifiOff, X,
  Plus, PanelLeftClose, PanelLeftOpen, Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ragApi, ragSessionsApi,
  ChunkUsed, RagChatSession, RagChatMessage,
} from "@/lib/api";
import { useSidebar } from "@/contexts/sidebar-context";

// ── Local type: extend RagChatMessage with per-response metadata ──────────────

interface LocalMsg extends RagChatMessage {
  has_disclaimer?: boolean;
  fallback_mode?:  boolean;
  citation_score?: number;
  semantic_score?: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const SUGGESTED_QUESTIONS = [
  "Quy định về thủ tục đăng ký khai sinh",
  "Thẩm quyền ban hành văn bản hành chính",
  "Thời hạn giải quyết hồ sơ hành chính theo NĐ 61",
];

const PROGRESS_STEPS = [
  { at: 0,     label: "Đang tìm kiếm trong kho văn bản..." },
  { at: 2000,  label: "Đang xếp hạng kết quả liên quan..." },
  { at: 5000,  label: "Đang tổng hợp câu trả lời..." },
  { at: 15000, label: "LLM đang xử lý (có thể mất thêm vài giây)..." },
];

// ── renderAnswerWithCitations ─────────────────────────────────────────────────

function renderAnswerWithCitations(
  answer: string,
  onCitationClick: (n: number) => void
): React.ReactNode {
  const lines = answer.split("\n");
  const elements: React.ReactNode[] = [];

  function parseInline(text: string, keyPrefix: string): React.ReactNode[] {
    const parts: React.ReactNode[] = [];
    const regex = /(\*\*(.+?)\*\*)|(\[(\d+)\])/g;
    let last = 0;
    let match: RegExpExecArray | null;
    let idx = 0;
    while ((match = regex.exec(text)) !== null) {
      if (match.index > last) {
        parts.push(text.slice(last, match.index));
      }
      if (match[1]) {
        parts.push(
          <strong key={`${keyPrefix}-b-${idx}`}>{match[2]}</strong>
        );
      } else if (match[3]) {
        const num = parseInt(match[4]);
        parts.push(
          <button
            key={`${keyPrefix}-c-${idx}`}
            onClick={() => onCitationClick(num)}
            className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-700 hover:bg-teal-200 cursor-pointer mx-0.5 transition-colors"
            title={`Xem nguồn [${num}]`}
          >
            {num}
          </button>
        );
      }
      last = match.index + match[0].length;
      idx++;
    }
    if (last < text.length) parts.push(text.slice(last));
    return parts;
  }

  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("## ")) {
      elements.push(
        <h4 key={i} className="text-sm font-semibold text-teal-700 mt-3 mb-1 first:mt-0">
          {trimmed.slice(3)}
        </h4>
      );
    } else if (trimmed === "") {
      return;
    } else {
      elements.push(
        <p key={i} className="mb-1.5 last:mb-0">
          {parseInline(line, `p-${i}`)}
        </p>
      );
    }
  });

  return elements;
}

// ── ConfidenceMeter ───────────────────────────────────────────────────────────

function ConfidenceMeter({
  confidence,
  citationScore,
  semanticScore,
}: {
  confidence: number;
  citationScore: number;
  semanticScore: number;
}) {
  const pct = Math.round(confidence * 100);
  const barColor =
    confidence >= 0.7 ? "bg-teal-500" :
    confidence >= 0.4 ? "bg-amber-500" :
    "bg-red-500";
  const label =
    confidence >= 0.7 ? "Cao" :
    confidence >= 0.4 ? "Trung bình" :
    "Thấp";

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Độ tin cậy:</span>
        <span className="text-xs font-medium">{label}</span>
        <span className="text-xs text-muted-foreground">{pct}%</span>
      </div>
      <div className="w-32 h-1.5 bg-gray-200 rounded-full">
        <div
          className={`h-1.5 rounded-full ${barColor} transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex gap-3 text-xs text-muted-foreground">
        <span>Citation: {Math.round(citationScore * 100)}%</span>
        <span>Ngữ nghĩa: {Math.round(semanticScore * 100)}%</span>
      </div>
    </div>
  );
}

// ── CopyButton ────────────────────────────────────────────────────────────────

function CopyButton({ answer, chunks }: { answer: string; chunks: ChunkUsed[] }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const sources = chunks
      .map((c, i) => `[${i + 1}] ${c.so_ki_hieu || c.document_title || "Không rõ nguồn"}`)
      .join("\n");
    const text = `${answer}\n\nNguồn:\n${sources}`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
    >
      {copied ? <span>✅ Đã copy</span> : <span>📋 Copy</span>}
    </button>
  );
}

// ── LLMStatusBadge ────────────────────────────────────────────────────────────

function LLMStatusBadge() {
  const { data } = useQuery({
    queryKey: ["rag-health"],
    queryFn: ragApi.health,
    refetchInterval: 30_000,
    staleTime: 0,
  });

  if (!data) return null;

  const online = data.llm === "ok";
  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      {online ? (
        <>
          <Wifi className="h-3.5 w-3.5 text-green-500" />
          <span className="text-green-600 font-medium">LLM trực tuyến</span>
          <span>·</span>
          <span>{data.total_chunks} đoạn văn bản</span>
        </>
      ) : (
        <>
          <WifiOff className="h-3.5 w-3.5 text-orange-500" />
          <span className="text-orange-600 font-medium">LLM chưa kết nối</span>
        </>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function RAGSearchPage() {
  // ── Core state ────────────────────────────────────────────────────────────
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progressStep, setProgressStep] = useState(0);
  const [activeCitation, setActiveCitation] = useState<number | null>(null);
  const [activeCitationChunks, setActiveCitationChunks] = useState<ChunkUsed[]>([]);
  const progressTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const recognitionRef = useRef<any>(null);

  // ── Session state ─────────────────────────────────────────────────────────
  const [sessions, setSessions] = useState<RagChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<LocalMsg[]>([]);
  const [historyCollapsed, setHistoryCollapsed] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(true);

  const { setCollapsed } = useSidebar();

  // ── Auto-collapse sidebar on this page ───────────────────────────────────
  useEffect(() => {
    setCollapsed(true);
    return () => setCollapsed(false);
  }, [setCollapsed]);

  // ── Speech recognition setup ──────────────────────────────────────────────
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return;
    }

    setSpeechSupported(true);
    const recognition = new SpeechRecognition();
    recognition.lang = "vi-VN";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setQuery((prev) => {
        const sep = prev.trim() ? " " : "";
        return prev + sep + transcript;
      });
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
    };
  }, []);

  // ── Load sessions on mount ────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const list = await ragSessionsApi.list();
        setSessions(list);
      } catch (e) {
        console.error("Failed to load sessions", e);
      } finally {
        setLoadingSessions(false);
      }
    })();
  }, []);

  // ── Auto-scroll on new messages ───────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSearching]);

  // ── Close citation sidebar when switching sessions ────────────────────────
  useEffect(() => {
    setActiveCitation(null);
    setActiveCitationChunks([]);
  }, [currentSessionId]);

  // ── Cleanup timers on unmount ─────────────────────────────────────────────
  useEffect(() => {
    return () => {
      progressTimers.current.forEach(clearTimeout);
    };
  }, []);

  const clearProgressTimers = () => {
    progressTimers.current.forEach(clearTimeout);
    progressTimers.current = [];
  };

  const startProgressSteps = () => {
    clearProgressTimers();
    setProgressStep(0);
    PROGRESS_STEPS.forEach((step, i) => {
      if (i === 0) return;
      const t = setTimeout(() => setProgressStep(i), step.at);
      progressTimers.current.push(t);
    });
  };

  // ── Session handlers ──────────────────────────────────────────────────────

  const handleNewSession = useCallback(() => {
    setCurrentSessionId(null);
    setMessages([]);
    setActiveCitation(null);
    setActiveCitationChunks([]);
    setError(null);
  }, []);

  const handleSelectSession = useCallback(async (sessionId: string) => {
    try {
      const detail = await ragSessionsApi.get(sessionId);
      setCurrentSessionId(detail.id);
      setMessages(detail.messages as LocalMsg[]);
      setActiveCitation(null);
      setActiveCitationChunks([]);
      setError(null);
    } catch {
      setError("Không thể tải cuộc tra cứu này");
    }
  }, []);

  const handleDeleteSession = useCallback(async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await ragSessionsApi.delete(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (currentSessionId === sessionId) {
        handleNewSession();
      }
    } catch {
      setError("Không thể xóa cuộc tra cứu");
    }
  }, [currentSessionId, handleNewSession]);

  // ── Search / send message ─────────────────────────────────────────────────

  const handleSearch = useCallback(async () => {
    const q = query.trim();
    if (!q || isSearching) return;

    // Optimistic: append user bubble immediately
    const userMsg: LocalMsg = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: q,
      citations: null,
      confidence: null,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setQuery("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setError(null);
    setIsSearching(true);
    startProgressSteps();

    try {
      const res = await ragApi.query({
        query: q,
        top_k: 10,
        min_score: 0.35,
        session_id: currentSessionId ?? undefined,
      });

      const assistantMsg: LocalMsg = {
        id: `temp-a-${Date.now()}`,
        role: "assistant",
        content: res.answer,
        citations: res.chunks_used,
        confidence: res.confidence,
        created_at: new Date().toISOString(),
        has_disclaimer: res.has_disclaimer,
        fallback_mode:  res.fallback_mode,
        citation_score: res.citation_score,
        semantic_score: res.semantic_score,
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setCurrentSessionId(res.session_id);

      // Refresh sidebar list (also updates order/title for new sessions)
      const list = await ragSessionsApi.list();
      setSessions(list);
    } catch (err: unknown) {
      const e = err as { response?: { status?: number } };
      const status = e?.response?.status;
      let friendlyMsg = "Đã xảy ra lỗi, vui lòng thử lại.";
      if (status === 503) {
        friendlyMsg = "Hệ thống AI đang khởi động hoặc tạm thời không khả dụng. Vui lòng thử lại sau ít phút.";
      } else if (status === 404) {
        friendlyMsg = "Không tìm thấy cuộc tra cứu này.";
      } else if (status === 401) {
        friendlyMsg = "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.";
      } else if (!e?.response) {
        friendlyMsg = "Không thể kết nối đến server. Kiểm tra mạng hoặc thử lại.";
      }
      setError(friendlyMsg);
      // User message stays in list so they know what was sent
    } finally {
      clearProgressTimers();
      setIsSearching(false);
    }
  }, [query, isSearching, currentSessionId]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSearch();
    }
  };

  const handleToggleMic = useCallback(() => {
    if (!recognitionRef.current || isSearching) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch {
        // start() có thể throw nếu gọi liên tiếp quá nhanh
      }
    }
  }, [isListening, isSearching]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full overflow-hidden">

      {/* ── History panel ──────────────────────────────────────────────────── */}
      <div className={cn(
        "border-r bg-card flex flex-col transition-all duration-200 shrink-0",
        historyCollapsed ? "w-0 overflow-hidden" : "w-[220px]"
      )}>
        <div className="flex items-center justify-between p-3 border-b shrink-0">
          <span className="text-sm font-medium truncate">Lịch sử tra cứu</span>
          <button
            onClick={() => setHistoryCollapsed(true)}
            className="p-1 rounded hover:bg-muted text-muted-foreground shrink-0"
            title="Thu gọn"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        </div>

        <div className="p-2 shrink-0">
          <button
            onClick={handleNewSession}
            className="w-full flex items-center gap-2 text-sm px-3 py-2 border rounded-md hover:bg-muted transition-colors"
          >
            <Plus className="h-4 w-4 shrink-0" />
            <span>Cuộc tra cứu mới</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 space-y-0.5 pb-2">
          {loadingSessions ? (
            <p className="text-xs text-muted-foreground px-3 py-2">Đang tải...</p>
          ) : sessions.length === 0 ? (
            <p className="text-xs text-muted-foreground px-3 py-2">Chưa có lịch sử</p>
          ) : (
            sessions.map((s) => (
              <div
                key={s.id}
                onClick={() => handleSelectSession(s.id)}
                className={cn(
                  "group flex items-center justify-between gap-1 px-3 py-2 rounded-md text-sm cursor-pointer",
                  s.id === currentSessionId
                    ? "bg-muted font-medium"
                    : "hover:bg-muted/50"
                )}
              >
                <span className="truncate flex-1">{s.title}</span>
                <button
                  onClick={(e) => handleDeleteSession(s.id, e)}
                  className="opacity-0 group-hover:opacity-100 shrink-0 p-0.5 rounded hover:text-destructive"
                  title="Xóa cuộc tra cứu"
                >
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Collapsed toggle ────────────────────────────────────────────────── */}
      {historyCollapsed && (
        <button
          onClick={() => setHistoryCollapsed(false)}
          className="border-r px-1.5 flex items-center hover:bg-muted text-muted-foreground shrink-0"
          title="Mở lịch sử tra cứu"
        >
          <PanelLeftOpen className="h-4 w-4" />
        </button>
      )}

      {/* ── Chat area ───────────────────────────────────────────────────────── */}
      <div className={cn(
        "flex-1 flex flex-col overflow-hidden min-w-0",
        activeCitation !== null ? "mr-[400px]" : ""
      )}>
        {/* Header */}
        <div className="border-b px-6 py-4 shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-teal-50 p-2">
              <Sparkles className="h-5 w-5 text-teal-600" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">Tra cứu AI</h1>
              <p className="text-xs text-muted-foreground">
                Tra cứu văn bản pháp lý và thủ tục hành chính bằng ngôn ngữ tự nhiên
              </p>
            </div>
          </div>
          <LLMStatusBadge />
        </div>

        {/* Messages list */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">

          {/* Empty state */}
          {messages.length === 0 && !isSearching && (
            <div className="flex flex-col items-center gap-4 py-10 text-center text-muted-foreground">
              <Sparkles className="h-10 w-10 opacity-20" />
              <div>
                <p className="font-medium text-sm text-foreground">Tra cứu thông minh</p>
                <p className="text-xs mt-1">
                  Đặt câu hỏi về văn bản pháp luật, AI sẽ tìm và tổng hợp câu trả lời từ kho văn bản.
                </p>
              </div>
              <div className="flex flex-col gap-2 w-full max-w-sm mt-2">
                {SUGGESTED_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => setQuery(q)}
                    className="text-left text-xs px-3 py-2 rounded-md border border-teal-200 text-teal-700 bg-teal-50/50 hover:bg-teal-50 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Message bubbles */}
          {messages.map((msg) =>
            msg.role === "user" ? (
              <div key={msg.id} className="flex justify-end">
                <div className="max-w-[75%] bg-teal-600 text-white rounded-2xl rounded-br-sm px-4 py-2.5 text-sm whitespace-pre-wrap">
                  {msg.content}
                </div>
              </div>
            ) : (
              <div key={msg.id} className="flex justify-start">
                <div className="max-w-[85%] w-full rounded-lg border bg-card p-4 text-sm leading-relaxed space-y-3">

                  {/* Confidence + copy — only when metadata available (new messages) */}
                  {msg.confidence !== null &&
                   msg.confidence !== undefined &&
                   msg.citation_score !== undefined &&
                   !msg.fallback_mode && (
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <ConfidenceMeter
                        confidence={msg.confidence}
                        citationScore={msg.citation_score ?? 0}
                        semanticScore={msg.semantic_score ?? 0}
                      />
                      {msg.citations && msg.citations.length > 0 && (
                        <CopyButton answer={msg.content} chunks={msg.citations} />
                      )}
                    </div>
                  )}

                  {/* Answer text with ## headings, **bold**, [n] citations */}
                  <div className="text-slate-700">
                    {renderAnswerWithCitations(msg.content, (n) => {
                      setActiveCitationChunks(msg.citations ?? []);
                      setActiveCitation(n - 1);
                    })}
                  </div>

                  {/* Citation pills */}
                  {msg.citations && msg.citations.length > 0 && (
                    <div className="pt-2 border-t flex flex-wrap gap-2">
                      <span className="text-xs text-slate-400">Nguồn trích dẫn:</span>
                      {msg.citations.map((chunk, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            setActiveCitationChunks(msg.citations ?? []);
                            setActiveCitation(i);
                          }}
                          title={
                            chunk.so_ki_hieu
                              ? chunk.document_title
                                ? `${chunk.so_ki_hieu} — ${chunk.document_title}`
                                : chunk.so_ki_hieu
                              : chunk.document_title || "Không rõ nguồn"
                          }
                          className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border transition-colors bg-white border-slate-200 text-slate-500 hover:border-teal-300 hover:text-teal-600 max-w-[200px]"
                        >
                          <span className="shrink-0">{i + 1}.</span>
                          <span className="truncate">
                            {chunk.so_ki_hieu
                              ? chunk.document_title
                                ? `${chunk.so_ki_hieu} — ${chunk.document_title}`
                                : chunk.so_ki_hieu
                              : chunk.document_title || "Không rõ nguồn"}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          )}

          {/* Progress bubble while searching */}
          {isSearching && (
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded-lg border bg-muted/40 px-4 py-3 text-sm text-muted-foreground flex items-center gap-3">
                <div className="h-4 w-4 rounded-full border-2 border-teal-600 border-t-transparent animate-spin flex-shrink-0" />
                <div className="flex flex-col gap-0.5">
                  {PROGRESS_STEPS.slice(0, progressStep + 1).map((step, i) => (
                    <span
                      key={i}
                      className={i === progressStep ? "text-foreground font-medium" : "opacity-40"}
                    >
                      {step.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Error bubble — hiện ngay sau message cuối (assistant bị lỗi) */}
          {error && !isSearching && (
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0 text-red-500" />
                <span>{error}</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="border-t p-4 shrink-0">
          <div className={cn(
            "relative rounded-3xl border bg-background flex items-end p-2",
            "focus-within:ring-2 focus-within:ring-teal-500/20 focus-within:border-teal-400 transition-shadow"
          )}>
            <textarea
              ref={textareaRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
              }}
              onKeyDown={handleKeyDown}
              placeholder="Hỏi tiếp về thủ tục này..."
              rows={1}
              disabled={isSearching}
              className="flex-1 resize-none border-0 bg-transparent focus:outline-none focus:ring-0 px-3 py-2 max-h-[200px] overflow-y-auto text-sm"
            />
            {speechSupported && (
              <button
                type="button"
                onClick={handleToggleMic}
                disabled={isSearching}
                title={isListening ? "Đang nghe... (click để dừng)" : "Nhập bằng giọng nói"}
                className={cn(
                  "shrink-0 h-8 w-8 rounded-full flex items-center justify-center transition-colors mb-1 mr-1",
                  isListening
                    ? "bg-red-100 text-red-600 animate-pulse"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Mic className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={handleSearch}
              disabled={!query.trim() || isSearching}
              className={cn(
                "shrink-0 h-8 w-8 rounded-full flex items-center justify-center transition-colors mb-1 mr-1",
                query.trim() && !isSearching
                  ? "bg-teal-600 text-white hover:bg-teal-700"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              )}
              title="Gửi"
            >
              <ArrowUp className="h-4 w-4" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-1.5 px-1">
            Enter để gửi · Shift+Enter để xuống dòng
          </p>
        </div>
      </div>

      {/* ── Citation sidebar (fixed right overlay) ──────────────────────────── */}
      {activeCitation !== null && activeCitationChunks[activeCitation] && (
        <div className="fixed right-0 top-0 h-full w-[400px] border-l bg-white shadow-2xl z-40 flex flex-col">
          {/* Sidebar header */}
          <div className="flex items-center justify-between px-4 py-3 border-b bg-slate-50">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-teal-600" />
              <span className="text-sm font-semibold text-slate-700">
                Nguồn trích dẫn [{activeCitation + 1}]
              </span>
            </div>
            <button
              onClick={() => setActiveCitation(null)}
              className="p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between px-4 py-2 border-b text-xs text-slate-500">
            <span>
              {activeCitation + 1} / {activeCitationChunks.length} nguồn
            </span>
            <div className="flex gap-1">
              <button
                disabled={activeCitation === 0}
                onClick={() => setActiveCitation(activeCitation - 1)}
                className="px-2 py-1 rounded hover:bg-slate-100 disabled:opacity-40"
              >
                ← Trước
              </button>
              <button
                disabled={activeCitation === activeCitationChunks.length - 1}
                onClick={() => setActiveCitation(activeCitation + 1)}
                className="px-2 py-1 rounded hover:bg-slate-100 disabled:opacity-40"
              >
                Tiếp →
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {(() => {
              const chunk = activeCitationChunks[activeCitation];
              return (
                <div className="space-y-3">
                  <div className="p-3 bg-teal-50 rounded-lg border border-teal-100">
                    <p className="text-xs text-teal-600 font-medium mb-0.5">Tài liệu</p>
                    <p className="text-sm font-semibold text-slate-800">
                      {chunk.so_ki_hieu || chunk.document_title}
                    </p>
                    {chunk.dieu_khoan && (
                      <p className="text-xs text-slate-500 mt-1">{chunk.dieu_khoan}</p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-600">
                      Độ khớp: {Math.round((chunk.score ?? 0) * 100)}%
                    </span>
                    {chunk.rerank_score && (
                      <span className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-600">
                        Rerank: {chunk.rerank_score.toFixed(2)}
                      </span>
                    )}
                  </div>

                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-2 uppercase tracking-wide">
                      Nội dung đoạn trích
                    </p>
                    <div className="text-sm text-slate-700 leading-relaxed bg-slate-50 rounded-lg p-3 border whitespace-pre-wrap">
                      {chunk.content_preview}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

    </div>
  );
}
