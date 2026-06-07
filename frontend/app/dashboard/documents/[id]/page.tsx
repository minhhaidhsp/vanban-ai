"use client";

import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { documentApi } from "@/lib/api";
import type { ReviewChange } from "@/lib/api";
import type { Editor } from "@tiptap/react";
import { useToast } from "@/hooks/use-toast";
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

// ── Helpers ───────────────────────────────────────────────────────────────────

const ND30_SECTION_FIELDS = ["trichYeu", "canCu", "noiDung", "noiNhan"] as const;

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

function applyChangeToContent(raw: string, change: ReviewChange): string {
  try {
    const data = JSON.parse(raw) as Record<string, unknown>;
    const target =
      ND30_SECTION_FIELDS.includes(change.section as (typeof ND30_SECTION_FIELDS)[number]) &&
      change.section !== "general"
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

  const [editorKey, setEditorKey] = useState(0);
  const [overrideContent, setOverrideContent] = useState<string | undefined>(undefined);
  const overrideContentRef = useRef<string | undefined>(undefined);

  // ── AI Review state ───────────────────────────────────────────────────────
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewChanges, setReviewChanges] = useState<ReviewChange[]>([]);
  const [reviewSummary, setReviewSummary] = useState("");
  const [acceptedIds, setAcceptedIds] = useState<Set<number>>(new Set());
  const [rejectedIds, setRejectedIds] = useState<Set<number>>(new Set());

  const editorMapRef = useRef<Map<string, Editor>>(new Map());

  const getCurrentContentFromEditors = (): string | null => {
    const map = editorMapRef.current;
    if (map.size === 0) return overrideContentRef.current ?? doc?.content ?? null;
    const nd30: Record<string, string> = { version: "nd30" };
    map.forEach((editor, fieldId) => {
      nd30[fieldId] = editor.getHTML();
    });
    return JSON.stringify(nd30);
  };

  const handleReview = async (checkContent?: string) => {
    const contentToReview = checkContent ?? getCurrentContentFromEditors();
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
      const validChanges = data.changes.filter(
        (c) => c.original?.trim() !== c.revised?.trim() && c.original?.trim().length > 0
      );
      setReviewChanges(validChanges);
      setReviewSummary(data.summary ?? "");
      setAcceptedIds(new Set());
      setRejectedIds(new Set());
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
      const normalize = (s: string) =>
        s
          .replace(/<[^>]*>/g, " ")
          .replace(/&nbsp;/g, " ")
          .replace(/&amp;/g, "&")
          .replace(/–|—/g, "-")
          .replace(/\s+/g, " ")
          .trim();

      const normalizedOriginal = normalize(change.original);
      const normalizedRevised = normalize(change.revised);

      if (normalizedOriginal === normalizedRevised) {
        toast({ title: "Không cần sửa", description: "Nội dung gốc và đề nghị sửa giống nhau." });
        setAcceptedIds((prev) => new Set(Array.from(prev).concat(i)));
        return;
      }

      const { doc: prosemirrorDoc } = editor.state;
      const fullText = editor.getText();
      const normalizedFull = normalize(fullText);
      const searchIdx = normalizedFull.indexOf(normalizedOriginal);

      if (searchIdx !== -1) {
        let mappedFrom = -1;
        let mappedTo = -1;
        let normalizedCount = 0;

        prosemirrorDoc.descendants((node, pos) => {
          if (mappedTo !== -1) return false;
          if (!node.isText || !node.text) return;

          const nodeNorm = normalize(node.text);

          if (mappedFrom === -1 && normalizedCount + nodeNorm.length > searchIdx) {
            mappedFrom = pos + (searchIdx - normalizedCount);
          }

          const endIdx = searchIdx + normalizedOriginal.length;
          if (mappedFrom !== -1 && normalizedCount + nodeNorm.length >= endIdx) {
            mappedTo = pos + (endIdx - normalizedCount);
          }

          normalizedCount += nodeNorm.length + 1;
        });

        if (mappedFrom !== -1 && mappedTo !== -1) {
          editor
            .chain()
            .focus()
            .setTextSelection({ from: mappedFrom, to: mappedTo })
            .insertContent(normalizedRevised)
            .run();
          setAcceptedIds((prev) => new Set(Array.from(prev).concat(i)));
          return;
        }
      }

      toast({
        title: "Không thể áp dụng",
        description: "Không tìm thấy đoạn văn bản trong editor. Có thể đã được sửa trước đó.",
        variant: "destructive",
      });
    } else {
      const raw = overrideContentRef.current ?? overrideContent ?? doc?.content ?? "{}";
      const newContent = applyChangeToContent(raw, change);
      overrideContentRef.current = newContent;
      setOverrideContent(newContent);
      setEditorKey((k) => k + 1);
    }

    setAcceptedIds((prev) => new Set(Array.from(prev).concat(i)));
  };

  const rejectChange = (i: number) => {
    setRejectedIds((prev) => new Set(Array.from(prev).concat(i)));
  };

  const scrollToAndHighlight = (change: ReviewChange) => {
    const fieldId = change.section ? (SECTION_TO_FIELD[change.section] ?? "noiDung") : "noiDung";
    const editor = editorMapRef.current.get(fieldId);
    if (!editor) return;

    const searchText = change.original
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .trim();
    if (!searchText || searchText.length < 3) return;

    const { doc: prosemirrorDoc } = editor.state;
    let foundFrom = -1;
    let foundTo = -1;

    prosemirrorDoc.descendants((node, pos) => {
      if (foundFrom !== -1) return false;
      if (!node.isText || !node.text) return;
      const idx = node.text.indexOf(searchText);
      if (idx !== -1) {
        foundFrom = pos + idx;
        foundTo = foundFrom + searchText.length;
        return false;
      }
    });

    if (foundFrom === -1 && searchText.length > 50) {
      const shortSearch = searchText.slice(0, 50);
      prosemirrorDoc.descendants((node, pos) => {
        if (foundFrom !== -1) return false;
        if (!node.isText || !node.text) return;
        const idx = node.text.indexOf(shortSearch);
        if (idx !== -1) {
          foundFrom = pos + idx;
          foundTo = foundFrom + shortSearch.length;
          return false;
        }
      });
    }

    if (foundFrom === -1) {
      toast({
        title: "Không tìm thấy",
        description: "Đoạn văn bản này có thể đã được sửa hoặc không còn trong editor.",
        variant: "destructive",
      });
      return;
    }

    editor.commands.focus();
    editor.commands.setTextSelection({ from: foundFrom, to: foundTo });

    setTimeout(() => {
      const { from } = editor.state.selection;
      const coords = editor.view.coordsAtPos(from);
      const editorEl =
        editor.view.dom.closest(".overflow-y-auto") ?? editor.view.dom.parentElement;
      if (editorEl && coords) {
        const rect = editorEl.getBoundingClientRect();
        editorEl.scrollTo({
          top: editorEl.scrollTop + coords.top - rect.top - 200,
          behavior: "smooth",
        });
      }
    }, 50);
  };

  const applyAllPending = () => {
    const newAccepted = new Set(acceptedIds);

    if (editorMapRef.current.size > 0) {
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

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
        Đang tải...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 min-h-0 flex flex-col">
        <DocumentEditor
          key={editorKey}
          documentId={params.id}
          initialContent={overrideContent ?? doc?.content}
          initialTitle={doc?.title}
          onAiReview={handleReview}
          editorMapRef={editorMapRef}
          reviewChanges={reviewChanges}
          reviewSummary={reviewSummary}
          acceptedIds={acceptedIds}
          rejectedIds={rejectedIds}
          isReviewing={isReviewing}
          onApplyChange={applyChange}
          onRejectChange={rejectChange}
          onApplyAll={applyAllPending}
          onScrollToChange={scrollToAndHighlight}
        />
      </div>
    </div>
  );
}
