"use client";

import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { documentApi } from "@/lib/api";
import type { ReviewChange } from "@/lib/api";
import type { Editor } from "@tiptap/react";
import { useToast } from "@/hooks/use-toast";
import { Check, Loader2, ShieldCheck, X } from "lucide-react";
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

const SECTION_LABEL: Record<string, string> = {
  trichYeu: "Trích yếu",
  canCu: "Căn cứ",
  noiDung: "Nội dung",
  noiNhan: "Nơi nhận",
};

const ND30_SECTION_FIELDS = ["trichYeu", "canCu", "noiDung", "noiNhan"] as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

function hasText(content: unknown): boolean {
  try {
    const str = typeof content === "string" ? content : JSON.stringify(content ?? "");
    if (!str || str === "{}" || str === "null") return false;
    const stripped = str.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
    const textOnly = stripped.replace(/"[^"]*":/g, "").replace(/[{}"\\[\]]/g, "").trim();
    return textOnly.length > 5;
  } catch {
    return false;
  }
}

function applyChangeToContent(
  raw: string,
  change: ReviewChange
): string {
  try {
    const data = JSON.parse(raw) as Record<string, unknown>;
    const target =
      ND30_SECTION_FIELDS.includes(
        change.section as (typeof ND30_SECTION_FIELDS)[number]
      ) && change.section !== "general"
        ? (change.section as string)
        : null;

    let replaced = false;
    if (target && typeof data[target] === "string" && (data[target] as string).includes(change.original)) {
      data[target] = (data[target] as string).replace(change.original, change.revised);
      replaced = true;
    }
    if (!replaced) {
      for (const field of ND30_SECTION_FIELDS) {
        if (typeof data[field] === "string" && (data[field] as string).includes(change.original)) {
          data[field] = (data[field] as string).replace(change.original, change.revised);
          break;
        }
      }
    }
    return JSON.stringify(data);
  } catch {
    return raw;
  }
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function EditDocumentPage({ params }: { params: { id: string } }) {
  const { toast } = useToast();

  const { data: doc, isLoading } = useQuery({
    queryKey: ["document", params.id],
    queryFn: () => documentApi.get(params.id),
  });

  // Forces DocumentEditor remount with overridden content
  const [editorKey, setEditorKey] = useState(0);
  const [overrideContent, setOverrideContent] = useState<string | undefined>(undefined);
  // Sync ref so handleReview called right after setOverrideContent sees the new value
  const overrideContentRef = useRef<string | undefined>(undefined);

  // ── AI Review state ───────────────────────────────────────────────────────
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewChanges, setReviewChanges] = useState<ReviewChange[]>([]);
  const [reviewSummary, setReviewSummary] = useState("");
  const [showReviewPanel, setShowReviewPanel] = useState(false);
  const [acceptedIds, setAcceptedIds] = useState<Set<number>>(new Set());
  const [rejectedIds, setRejectedIds] = useState<Set<number>>(new Set());

  const handleReview = async (checkContent?: string) => {
    console.log('[Review] checkContent:', checkContent)
    console.log('[Review] checkContent type:', typeof checkContent)
    const contentToReview = checkContent ?? getCurrentContentFromEditors();
    console.log('[Review] editorMap size:', editorMapRef.current.size)
    console.log('[Review] editorMap keys:', [...editorMapRef.current.keys()])
    console.log('[Review] contentToReview type:', typeof contentToReview)
    console.log('[Review] contentToReview instanceof:', contentToReview instanceof Element ? 'DOM Element' : 'not DOM')
    if (!contentToReview || !hasText(contentToReview)) {
      toast({
        title: "Chưa có nội dung",
        description: "Vui lòng nhập nội dung văn bản trước khi rà soát.",
        variant: "destructive",
      });
      return;
    }
    setIsReviewing(true);
    try {
      const data = await documentApi.review(params.id, contentToReview);
      const validChanges = data.changes.filter(c =>
        c.original?.trim() !== c.revised?.trim() &&
        c.original?.trim().length > 0
      );
      setReviewChanges(validChanges);
      setReviewSummary(data.summary ?? "");
      setAcceptedIds(new Set());
      setRejectedIds(new Set());
      setShowReviewPanel(true);
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

  const SECTION_TO_FIELD: Record<string, string> = {
    trichYeu: "trichYeu",
    canCu: "canCu",
    noiDung: "noiDung",
    noiNhan: "noiNhan",
  };

  const applyChange = (i: number) => {
    const change = reviewChanges[i];
    const fieldId = change.section ? (SECTION_TO_FIELD[change.section] ?? "noiDung") : "noiDung";
    const editor = editorMapRef.current.get(fieldId);

    if (editor) {
      // Inject trực tiếp vào TipTap — không remount, giữ cursor và undo history
      const newHtml = editor.getHTML().replace(change.original, change.revised);
      editor.commands.setContent(newHtml);
    } else {
      // Fallback: remount editor với nội dung mới (khi editors chưa sẵn sàng)
      const raw = overrideContentRef.current ?? overrideContent ?? doc?.content ?? "{}";
      const newContent = applyChangeToContent(raw, change);
      overrideContentRef.current = newContent;
      setOverrideContent(newContent);
      setEditorKey((k) => k + 1);
    }

    setAcceptedIds((prev) => new Set([...prev, i]));
  };

  const rejectChange = (i: number) => {
    setRejectedIds((prev) => new Set([...prev, i]));
  };

  const scrollToAndHighlight = (change: ReviewChange) => {
    const fieldId = change.section
      ? (SECTION_TO_FIELD[change.section] ?? 'noiDung')
      : 'noiDung'
    const editor = editorMapRef.current.get(fieldId)
    if (!editor) return

    const searchText = change.original
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim()
    if (!searchText || searchText.length < 3) return

    const { doc } = editor.state
    let foundFrom = -1
    let foundTo = -1

    doc.descendants((node, pos) => {
      if (foundFrom !== -1) return false
      if (!node.isText || !node.text) return
      const idx = node.text.indexOf(searchText)
      if (idx !== -1) {
        foundFrom = pos + idx
        foundTo = foundFrom + searchText.length
        return false
      }
    })

    if (foundFrom === -1 && searchText.length > 50) {
      const shortSearch = searchText.slice(0, 50)
      doc.descendants((node, pos) => {
        if (foundFrom !== -1) return false
        if (!node.isText || !node.text) return
        const idx = node.text.indexOf(shortSearch)
        if (idx !== -1) {
          foundFrom = pos + idx
          foundTo = foundFrom + shortSearch.length
          return false
        }
      })
    }

    if (foundFrom === -1) {
      toast({
        title: "Không tìm thấy",
        description: "Đoạn văn bản này có thể đã được sửa hoặc không còn trong editor.",
        variant: "destructive",
      })
      return
    }

    editor.commands.focus()
    editor.commands.setTextSelection({ from: foundFrom, to: foundTo })

    setTimeout(() => {
      const { from } = editor.state.selection
      const coords = editor.view.coordsAtPos(from)
      const editorEl = editor.view.dom.closest('.overflow-y-auto')
        ?? editor.view.dom.parentElement
      if (editorEl && coords) {
        const rect = editorEl.getBoundingClientRect()
        editorEl.scrollTo({
          top: editorEl.scrollTop + coords.top - rect.top - 200,
          behavior: 'smooth',
        })
      }
    }, 50)
  };

  const applyAllPending = () => {
    const newAccepted = new Set(acceptedIds);

    if (editorMapRef.current.size > 0) {
      // Group pending changes by fieldId, apply sequentially per field
      const byField = new Map<string, ReviewChange[]>();
      reviewChanges.forEach((change, i) => {
        if (acceptedIds.has(i) || rejectedIds.has(i)) return;
        const fid = change.section ? (SECTION_TO_FIELD[change.section] ?? "noiDung") : "noiDung";
        if (!byField.has(fid)) byField.set(fid, []);
        byField.get(fid)!.push(change);
        newAccepted.add(i);
      });
      byField.forEach((changes, fieldId) => {
        const editor = editorMapRef.current.get(fieldId);
        if (!editor) return;
        let html = editor.getHTML();
        for (const change of changes) {
          html = html.replace(change.original, change.revised);
        }
        editor.commands.setContent(html);
      });
    } else {
      // Fallback: string replace + remount
      let raw = overrideContentRef.current ?? overrideContent ?? doc?.content ?? "{}";
      reviewChanges.forEach((change, i) => {
        if (acceptedIds.has(i) || rejectedIds.has(i)) return;
        raw = applyChangeToContent(raw, change);
        newAccepted.add(i);
      });
      overrideContentRef.current = raw;
      setOverrideContent(raw);
      setEditorKey((k) => k + 1);
    }

    setAcceptedIds(newAccepted);
  };

  const pendingCount = reviewChanges.filter((_, i) => !acceptedIds.has(i) && !rejectedIds.has(i)).length;

  const editorMapRef = useRef<Map<string, Editor>>(new Map());

  const getCurrentContentFromEditors = (): string | null => {
    const map = editorMapRef.current;
    console.log('[getContent] map size:', map.size)
    if (map.size === 0) return overrideContentRef.current ?? doc?.content ?? null;
    const nd30: Record<string, string> = { version: "nd30" };
    map.forEach((editor, fieldId) => {
      const html = editor.getHTML()
      console.log('[getContent] field:', fieldId, 'html type:', typeof html, 'html slice:', String(html).slice(0, 50))
      nd30[fieldId] = html
    });
    const result = JSON.stringify(nd30)
    console.log('[getContent] result type:', typeof result)
    return result
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

      <div className="flex-1 min-h-0 flex flex-col">
        <DocumentEditor
          key={editorKey}
          documentId={params.id}
          initialContent={overrideContent ?? doc?.content}
          initialTitle={doc?.title}
          onAiReview={handleReview}
          editorMapRef={editorMapRef}
        />
      </div>

      {/* ── Review Panel (slide-in drawer over right panel) ───────────────── */}
      <div
        className={[
          "fixed right-0 top-0 bottom-0 z-40 flex flex-col bg-white border-l shadow-2xl",
          "w-full sm:w-[400px] transition-transform duration-300",
          showReviewPanel ? "translate-x-0" : "translate-x-full",
        ].join(" ")}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-violet-50 shrink-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-violet-600" />
            <span className="font-semibold text-sm text-violet-900">Kết quả rà soát</span>
            <span className="text-[11px] bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded-full font-medium">
              {reviewChanges.length} thay đổi
            </span>
          </div>
          <button
            onClick={() => setShowReviewPanel(false)}
            className="text-muted-foreground hover:text-foreground p-1 rounded transition-colors"
            aria-label="Đóng"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Stats bar */}
        <div className="px-4 py-3 border-b shrink-0 space-y-2">
          {reviewChanges.length > 0 && (
            <>
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
            </>
          )}
          {reviewSummary && (
            <p className="text-xs text-green-800 bg-green-50 border border-green-200 rounded-lg p-2 leading-relaxed">
              {reviewSummary}
            </p>
          )}
        </div>

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
                className={[
                  "border rounded-lg p-3 space-y-2 text-xs transition-opacity",
                  accepted || rejected ? "opacity-50" : "",
                  accepted ? "border-green-200 bg-green-50/30" : "",
                  rejected ? "border-red-200 bg-red-50/30" : "",
                ].join(" ")}
              >
                {/* Badges row */}
                <div className="flex items-center gap-1 flex-wrap">
                  <span className={["inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded",
                    BADGE_COLOR[change.type] ?? "bg-gray-100 text-gray-700"].join(" ")}>
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

                {/* Original → Revised */}
                <div className="space-y-1">
                  <div
                    className="line-through text-red-600 bg-red-50 px-2 py-1 rounded leading-relaxed break-words cursor-pointer hover:bg-red-100 transition-colors"
                    onClick={() => scrollToAndHighlight(change)}
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

                {/* Action buttons */}
                {!accepted && !rejected && (
                  <div className="flex gap-1.5 pt-0.5">
                    <button
                      onClick={() => applyChange(i)}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md bg-green-50 text-green-700 hover:bg-green-100 text-[11px] font-medium transition-colors border border-green-200"
                    >
                      <Check className="h-3 w-3" /> Áp dụng
                    </button>
                    <button
                      onClick={() => rejectChange(i)}
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

        {/* Footer — Apply all pending */}
        {pendingCount > 0 && (
          <div className="px-4 py-3 border-t shrink-0">
            <button
              onClick={applyAllPending}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-colors"
            >
              <Check className="h-3.5 w-3.5" />
              Áp dụng tất cả ({pendingCount})
            </button>
          </div>
        )}

        {/* Loading overlay while reviewing */}
        {isReviewing && (
          <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center gap-3 z-10">
            <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
            <p className="text-sm text-violet-700 font-medium">Đang rà soát văn bản...</p>
          </div>
        )}
      </div>

    </div>
  );
}
