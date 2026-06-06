"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { documentApi } from "@/lib/api";
import type { ReviewChange, ReviewResult } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Check, Copy, Loader2, Sparkles, X } from "lucide-react";
import dynamic from "next/dynamic";

const DocumentEditor = dynamic(
  () => import("@/components/editor/document-editor").then((m) => m.DocumentEditor),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
        Đang tải...
      </div>
    ),
  }
);

// ── Badge helpers ─────────────────────────────────────────────────────────────

const BADGE_COLOR: Record<string, string> = {
  chinh_ta: "bg-red-100 text-red-700",
  the_thuc: "bg-purple-100 text-purple-700",
  van_phong: "bg-blue-100 text-blue-700",
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

// ── Page ──────────────────────────────────────────────────────────────────────

export default function EditDocumentPage({ params }: { params: { id: string } }) {
  const { toast } = useToast();

  const { data: doc, isLoading } = useQuery({
    queryKey: ["document", params.id],
    queryFn: () => documentApi.get(params.id),
  });

  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewResult, setReviewResult] = useState<ReviewResult | null>(null);
  const [showReview, setShowReview] = useState(false);
  const [reviewTab, setReviewTab] = useState<"text" | "changes">("text");
  const [copied, setCopied] = useState(false);

  const handleReview = async () => {
    setIsReviewing(true);
    try {
      const data = await documentApi.review(params.id);
      setReviewResult(data);
      setShowReview(true);
      setReviewTab("text");
    } catch {
      toast({
        title: "Lỗi AI Review",
        description: "Không thể kết nối LLM. Vui lòng thử lại.",
        variant: "destructive",
      });
    } finally {
      setIsReviewing(false);
    }
  };

  const handleCopyReview = async () => {
    if (!reviewResult) return;
    await navigator.clipboard.writeText(reviewResult.reviewed_text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApplyToEditor = async () => {
    if (!reviewResult) return;
    await navigator.clipboard.writeText(reviewResult.reviewed_text);
    toast({ title: "Đã copy vào clipboard", description: "Ctrl+V để dán vào văn bản." });
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
        Đang tải...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full relative">

      {/* Thin action bar */}
      <div className="flex items-center justify-end px-4 py-1.5 border-b bg-muted/20 shrink-0">
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs gap-1.5 text-violet-700 hover:text-violet-800 hover:bg-violet-50"
          onClick={handleReview}
          disabled={isReviewing}
        >
          {isReviewing
            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
            : <Sparkles className="h-3.5 w-3.5" />}
          {isReviewing ? "Đang rà soát..." : "AI Review"}
        </Button>
      </div>

      <div className="flex-1 min-h-0 flex flex-col">
        <DocumentEditor
          documentId={params.id}
          initialContent={doc?.content}
          initialTitle={doc?.title}
        />
      </div>

      {/* ── Review Modal ─────────────────────────────────────────────────── */}
      {showReview && reviewResult && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-50"
            onClick={() => setShowReview(false)}
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div
              className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3 border-b shrink-0">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-violet-600" />
                  <span className="font-semibold text-sm">AI Review văn bản</span>
                </div>
                <button
                  onClick={() => setShowReview(false)}
                  className="text-muted-foreground hover:text-foreground p-1 rounded transition-colors"
                  aria-label="Đóng"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Summary */}
              {reviewResult.summary && (
                <div className="mx-5 mt-3 p-3 bg-green-50 rounded-lg border border-green-200 shrink-0">
                  <p className="text-[10px] font-semibold uppercase text-green-700 mb-1">Tóm tắt</p>
                  <p className="text-sm text-green-800">{reviewResult.summary}</p>
                </div>
              )}

              {/* Tabs */}
              <div className="flex border-b mt-3 px-5 shrink-0">
                {(["text", "changes"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setReviewTab(tab)}
                    className={[
                      "px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
                      reviewTab === tab
                        ? "border-violet-600 text-violet-700"
                        : "border-transparent text-muted-foreground hover:text-foreground",
                    ].join(" ")}
                  >
                    {tab === "text"
                      ? "Văn bản đã chỉnh"
                      : `Thay đổi (${reviewResult.changes.length})`}
                  </button>
                ))}
              </div>

              {/* Content */}
              <div className="flex-1 min-h-0 overflow-y-auto p-5">

                {reviewTab === "text" && (
                  <div className="flex flex-col gap-3 h-full">
                    <textarea
                      readOnly
                      value={reviewResult.reviewed_text}
                      className="flex-1 min-h-[280px] font-mono text-xs resize-none border rounded-lg p-3 bg-muted/30"
                    />
                    <div className="flex gap-2 shrink-0">
                      <Button size="sm" variant="outline" className="gap-1.5" onClick={handleCopyReview}>
                        {copied
                          ? <Check className="h-3.5 w-3.5 text-green-600" />
                          : <Copy className="h-3.5 w-3.5" />}
                        {copied ? "Đã copy" : "Copy"}
                      </Button>
                      <Button size="sm" variant="outline" className="gap-1.5" onClick={handleApplyToEditor}>
                        <Sparkles className="h-3.5 w-3.5" />
                        Áp dụng vào editor
                      </Button>
                    </div>
                  </div>
                )}

                {reviewTab === "changes" && (
                  <div className="space-y-3">
                    {reviewResult.changes.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        Không có thay đổi nào
                      </p>
                    )}
                    {reviewResult.changes.map((change: ReviewChange, i: number) => (
                      <div key={i} className="border rounded-lg p-3 space-y-2 text-xs">
                        <span
                          className={[
                            "inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded",
                            BADGE_COLOR[change.type] ?? "bg-gray-100 text-gray-700",
                          ].join(" ")}
                        >
                          {BADGE_LABEL[change.type] ?? change.type}
                        </span>
                        <div className="space-y-1">
                          <div className="line-through text-red-600 bg-red-50 px-2 py-1 rounded leading-relaxed">
                            {change.original}
                          </div>
                          <div className="text-green-700 bg-green-50 px-2 py-1 rounded leading-relaxed">
                            {change.revised}
                          </div>
                        </div>
                        {change.reason && (
                          <p className="text-[11px] text-muted-foreground">{change.reason}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

              </div>

              {/* Footer */}
              <div className="flex justify-end px-5 py-3 border-t shrink-0">
                <Button variant="outline" size="sm" onClick={() => setShowReview(false)}>
                  Đóng
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

    </div>
  );
}
