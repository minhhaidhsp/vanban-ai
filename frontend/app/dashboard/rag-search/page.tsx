"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, BookOpen, Search, Sparkles, Wifi, WifiOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ragApi, ChunkUsed, RAGQueryResponse } from "@/lib/api";

// ── Suggested questions ───────────────────────────────────────────────────────

const SUGGESTED_QUESTIONS = [
  "Quy định về thủ tục đăng ký khai sinh",
  "Thẩm quyền ban hành văn bản hành chính",
  "Thời hạn giải quyết hồ sơ hành chính theo NĐ 61",
];

// ── Progress steps ────────────────────────────────────────────────────────────

const PROGRESS_STEPS = [
  { at: 0,    label: "Đang tìm kiếm trong kho văn bản..." },
  { at: 2000, label: "Đang xếp hạng kết quả liên quan..." },
  { at: 5000, label: "Đang tổng hợp câu trả lời..." },
  { at: 15000, label: "LLM đang xử lý (có thể mất thêm vài giây)..." },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseAnswerWithCitations(answer: string, onCitationClick: (n: number) => void) {
  const parts: React.ReactNode[] = [];
  const regex = /\[(\d+)\]/g;
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(answer)) !== null) {
    if (match.index > last) {
      parts.push(answer.slice(last, match.index));
    }
    const num = parseInt(match[1]);
    parts.push(
      <button
        key={match.index}
        onClick={() => onCitationClick(num)}
        className="inline-flex items-center justify-center rounded-full bg-blue-600 text-white text-[10px] font-bold w-5 h-5 mx-0.5 hover:bg-blue-700 transition-colors cursor-pointer leading-none"
        title={`Xem nguồn [${num}]`}
      >
        {num}
      </button>
    );
    last = match.index + match[0].length;
  }
  if (last < answer.length) {
    parts.push(answer.slice(last));
  }
  return parts;
}

// ── Confidence Meter ──────────────────────────────────────────────────────────

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
    confidence >= 0.7 ? "bg-green-500" :
    confidence >= 0.4 ? "bg-yellow-500" :
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

// ── Copy Button ───────────────────────────────────────────────────────────────

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

// ── LLM Status Badge ──────────────────────────────────────────────────────────

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

// ── Citation Card ─────────────────────────────────────────────────────────────

function CitationCard({ chunk, index, isFallback }: { chunk: ChunkUsed; index: number; isFallback?: boolean }) {
  return (
    <Card
      id={`citation-${index}`}
      className={`scroll-mt-4 border-l-4 ${isFallback ? "border-l-orange-400" : "border-l-blue-400"}`}
    >
      <CardHeader className="pb-2 pt-3 px-4">
        <CardTitle className="text-sm flex items-center gap-2">
          <span className={`flex-shrink-0 inline-flex items-center justify-center rounded-full text-white text-[10px] font-bold w-5 h-5 ${isFallback ? "bg-orange-500" : "bg-blue-600"}`}>
            {index}
          </span>
          <span className="truncate">{chunk.so_ki_hieu || chunk.document_title || "Không rõ nguồn"}</span>
        </CardTitle>
        {chunk.dieu_khoan && (
          <p className="text-xs text-muted-foreground pl-7">{chunk.dieu_khoan}</p>
        )}
      </CardHeader>
      <CardContent className="px-4 pb-3">
        <p className="text-xs text-gray-700 leading-relaxed line-clamp-5">
          {chunk.content_preview}
        </p>
        <div className="flex gap-2 mt-2 flex-wrap">
          <Badge variant="outline" className="text-[10px]">
            Độ khớp: {(chunk.score * 100).toFixed(0)}%
          </Badge>
          {chunk.rerank_score !== null && chunk.rerank_score !== undefined && (
            <Badge variant="outline" className="text-[10px]">
              Rerank: {chunk.rerank_score.toFixed(2)}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function RAGSearchPage() {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [result, setResult] = useState<RAGQueryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progressStep, setProgressStep] = useState(0);
  const progressTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

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

  const scrollToCitation = useCallback((n: number) => {
    const el = document.getElementById(`citation-${n}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      el.classList.add("ring-2", "ring-blue-400");
      setTimeout(() => el.classList.remove("ring-2", "ring-blue-400"), 1500);
    }
  }, []);

  const handleSearch = useCallback(async () => {
    const q = query.trim();
    if (!q || isSearching) return;

    setIsSearching(true);
    setResult(null);
    setError(null);
    startProgressSteps();

    try {
      const res = await ragApi.query({ query: q, top_k: 10, min_score: 0.35 });
      setResult(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Lỗi không xác định";
      setError(msg);
    } finally {
      clearProgressTimers();
      setIsSearching(false);
    }
  }, [query, isSearching]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSearch();
    }
  };

  useEffect(() => {
    return () => clearProgressTimers();
  }, []);

  const hasResult = result && !isSearching;
  const hasChunks = hasResult && result.chunks_used.length > 0;
  const noResults = hasResult && result.chunks_used.length === 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h1 className="font-semibold text-lg">Tra cứu AI</h1>
        </div>
        <LLMStatusBadge />
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel */}
        <div className="flex flex-col flex-1 overflow-y-auto p-6 gap-5 min-w-0">
          {/* Search bar */}
          <div className="flex flex-col gap-2">
            <Textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Nhập câu hỏi về văn bản pháp luật... (Ctrl+Enter để tìm kiếm)"
              className="min-h-[80px] resize-none text-sm"
              disabled={isSearching}
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Ctrl+Enter để tìm kiếm</p>
              <Button
                onClick={handleSearch}
                disabled={!query.trim() || isSearching}
                size="sm"
                className="gap-2"
              >
                <Search className="h-4 w-4" />
                Tìm kiếm
              </Button>
            </div>
          </div>

          {/* Progress */}
          {isSearching && (
            <div className="flex items-center gap-3 rounded-lg border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
              <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin flex-shrink-0" />
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
          )}

          {/* Error state */}
          {error && (
            <div className="flex items-start gap-3 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Lỗi kết nối</p>
                <p className="text-xs mt-0.5 opacity-80">{error}</p>
              </div>
            </div>
          )}

          {/* Answer section */}
          {hasResult && (
            <div className="flex flex-col gap-3">
              {/* Result header */}
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex flex-col gap-1.5">
                  <h2 className="font-medium text-sm">Kết quả</h2>
                  {!result.fallback_mode && (
                    <ConfidenceMeter
                      confidence={result.confidence}
                      citationScore={result.citation_score ?? 0}
                      semanticScore={result.semantic_score ?? 0}
                    />
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground flex-shrink-0">
                  <span>{result.latency_ms}ms · {result.chunks_used.length} đoạn trích</span>
                  {hasChunks && (
                    <CopyButton answer={result.answer} chunks={result.chunks_used} />
                  )}
                </div>
              </div>

              {/* Disclaimer banner */}
              {result.has_disclaimer && !result.fallback_mode && (
                <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                  <span className="flex-shrink-0">⚠️</span>
                  <span>Độ tin cậy thấp — vui lòng đối chiếu với văn bản gốc trước khi sử dụng.</span>
                </div>
              )}

              {/* Fallback banner */}
              {result.fallback_mode && (
                <div className="flex items-start gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-800">
                  <span className="flex-shrink-0">🔌</span>
                  <span>LLM hiện không khả dụng. Hiển thị các đoạn văn bản liên quan nhất:</span>
                </div>
              )}

              {/* No results */}
              {noResults && (
                <div className="flex items-start gap-3 rounded-lg border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                  <BookOpen className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-foreground">Không tìm thấy thông tin</p>
                    <p className="text-xs mt-0.5">
                      Kho văn bản chưa có nội dung liên quan. Hãy thêm văn bản hoặc thử câu hỏi khác.
                    </p>
                  </div>
                </div>
              )}

              {/* Answer text */}
              {hasChunks && (
                <div className="rounded-lg border bg-card p-4 text-sm leading-relaxed whitespace-pre-wrap">
                  {result.fallback_mode
                    ? result.answer
                    : parseAnswerWithCitations(result.answer, scrollToCitation)}
                </div>
              )}
            </div>
          )}

          {/* Empty state */}
          {!isSearching && !result && !error && (
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
                    className="text-left text-xs px-3 py-2 rounded-md border hover:bg-accent hover:text-accent-foreground transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right panel — citation / fallback cards */}
        {hasChunks && (
          <div className="w-[40%] flex-shrink-0 overflow-y-auto border-l p-4 flex flex-col gap-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-1">
              {result.fallback_mode
                ? `Văn bản liên quan (${result.chunks_used.length})`
                : `Nguồn trích dẫn (${result.chunks_used.length})`}
            </p>
            {result.chunks_used.map((chunk, i) => (
              <CitationCard
                key={i}
                chunk={chunk}
                index={i + 1}
                isFallback={result.fallback_mode}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
