"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { documentSourcesApi, type RefDoc } from "@/lib/api";
import { FileText, Plus, X, BookOpen } from "lucide-react";
import { SourcePickerModal } from "./SourcePickerModal";

interface SourcesPanelProps {
  documentId: string;
  onSourcesChange: (ids: string[]) => void;
}

export function SourcesPanel({ documentId, onSourcesChange }: SourcesPanelProps) {
  const queryClient = useQueryClient();
  const [pickerOpen, setPickerOpen] = useState(false);

  const { data: sources = [] } = useQuery<RefDoc[]>({
    queryKey: ["document-sources", documentId],
    queryFn: () => documentSourcesApi.list(documentId),
    enabled: !!documentId && documentId !== "new-doc",
    onSuccess: (data) => onSourcesChange(data.map((d) => d.id)),
  });

  const removeMutation = useMutation({
    mutationFn: (refDocId: string) => documentSourcesApi.remove(documentId, refDocId),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["document-sources", documentId] }),
  });

  const handleAdded = () => {
    queryClient.invalidateQueries({ queryKey: ["document-sources", documentId] });
    setPickerOpen(false);
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 border-r">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b bg-white shrink-0">
        <div className="flex items-center gap-1.5">
          <BookOpen className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-semibold text-gray-800">Tài liệu tham chiếu</span>
        </div>
        <button
          onClick={() => setPickerOpen(true)}
          disabled={!documentId || documentId === "new-doc"}
          className="p-1 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title="Thêm từ kho"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Hint */}
      <p className="text-[10px] text-gray-400 px-3 pt-2 pb-1 shrink-0">
        AI chỉ tìm trong các tài liệu này
      </p>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-2 py-1 space-y-1">
        {sources.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8 px-3 gap-2">
            <FileText className="h-8 w-8 text-gray-200" />
            <p className="text-xs text-gray-400 leading-relaxed">
              Thêm tài liệu để AI tìm kiếm chính xác hơn
            </p>
            <button
              onClick={() => setPickerOpen(true)}
              disabled={!documentId || documentId === "new-doc"}
              className="text-xs text-blue-600 hover:text-blue-700 disabled:opacity-40 font-medium"
            >
              + Thêm từ kho
            </button>
          </div>
        ) : (
          sources.map((src) => (
            <div
              key={src.id}
              className="flex items-start gap-2 p-2 rounded-lg bg-white border border-gray-100 hover:border-blue-200 group transition-colors"
            >
              <FileText className="h-3.5 w-3.5 text-blue-500 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-800 truncate leading-tight">
                  {src.so_ki_hieu || src.title}
                </p>
                {src.loai_van_ban && (
                  <span className="inline-block text-[10px] bg-blue-100 text-blue-700 rounded px-1 mt-0.5">
                    {src.loai_van_ban}
                  </span>
                )}
              </div>
              <button
                onClick={() => removeMutation.mutate(src.id)}
                className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all shrink-0"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))
        )}
      </div>

      <SourcePickerModal
        open={pickerOpen}
        documentId={documentId}
        existingSourceIds={sources.map((s) => s.id)}
        onClose={() => setPickerOpen(false)}
        onAdded={handleAdded}
      />
    </div>
  );
}
