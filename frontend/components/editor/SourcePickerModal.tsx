"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { refDocApi, documentSourcesApi } from "@/lib/api";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, FileText, Loader2, Check } from "lucide-react";

interface SourcePickerModalProps {
  open: boolean;
  documentId: string;
  existingSourceIds: string[];
  onClose: () => void;
  onAdded: () => void;
}

export function SourcePickerModal({
  open, documentId, existingSourceIds, onClose, onAdded,
}: SourcePickerModalProps) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["ref-docs-picker", search],
    queryFn: () => refDocApi.list({ q: search || undefined, limit: 50 }),
    enabled: open,
  });

  const candidates = useMemo(
    () => (data?.items ?? []).filter((d) => !existingSourceIds.includes(d.id)),
    [data, existingSourceIds]
  );

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const handleAdd = async () => {
    if (!selected.size) return;
    if (!documentId || documentId === "new-doc") return;
    setAdding(true);
    try {
      await Promise.all(
        Array.from(selected).map((refId) => documentSourcesApi.add(documentId, refId))
      );
      setSelected(new Set());
      onAdded();
    } catch (e) {
      console.error("[SourcePickerModal] add failed:", e);
    } finally {
      setAdding(false);
    }
  };

  const handleClose = () => {
    setSelected(new Set());
    setSearch("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Thêm tài liệu tham chiếu</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm tài liệu..."
            className="pl-8 h-8 text-sm"
          />
        </div>

        <div className="max-h-72 overflow-y-auto space-y-1 -mx-1 px-1">
          {isLoading && (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            </div>
          )}

          {!isLoading && candidates.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-8">
              {search ? "Không tìm thấy tài liệu" : "Chưa có tài liệu trong kho"}
            </p>
          )}

          {candidates.map((doc) => {
            const isSelected = selected.has(doc.id);
            const isIndexed = doc.chunk_count != null ? doc.chunk_count > 0 : true;
            return (
              <button
                key={doc.id}
                type="button"
                disabled={!isIndexed}
                onClick={() => isIndexed && toggle(doc.id)}
                title={!isIndexed ? "File này chưa được xử lý, không thể dùng cho RAG" : undefined}
                className={`w-full flex items-start gap-3 p-2.5 rounded-lg border text-left transition-colors ${
                  !isIndexed
                    ? "border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed"
                    : isSelected
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-100 hover:border-blue-200 hover:bg-gray-50"
                }`}
              >
                <div className={`mt-0.5 shrink-0 h-4 w-4 rounded border flex items-center justify-center ${
                  isSelected ? "bg-blue-600 border-blue-600" : "border-gray-300"
                }`}>
                  {isSelected && <Check className="h-3 w-3 text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {doc.so_ki_hieu && (
                      <span className="text-xs font-mono text-gray-500">{doc.so_ki_hieu}</span>
                    )}
                    {doc.loai_van_ban && (
                      <span className="text-[10px] bg-gray-100 text-gray-600 rounded px-1">
                        {doc.loai_van_ban}
                      </span>
                    )}
                    {doc.chunk_count != null && (
                      doc.chunk_count > 0
                        ? <span className="text-[10px] px-1 py-0.5 rounded bg-green-100 text-green-700">✓ Đã lập chỉ mục</span>
                        : <span className="text-[10px] px-1 py-0.5 rounded bg-red-50 text-red-500">⚠ Chưa xử lý</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-800 mt-0.5 line-clamp-2">{doc.trich_yeu || doc.title}</p>
                </div>
              </button>
            );
          })}

          {/* Already added docs */}
          {(data?.items ?? []).filter((d) => existingSourceIds.includes(d.id)).map((doc) => (
            <div
              key={doc.id}
              className="flex items-start gap-3 p-2.5 rounded-lg border border-gray-100 bg-gray-50 opacity-60"
            >
              <div className="mt-0.5 shrink-0 h-4 w-4 rounded border border-green-500 bg-green-500 flex items-center justify-center">
                <Check className="h-3 w-3 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 truncate">{doc.trich_yeu || doc.title}</p>
                <p className="text-[10px] text-green-600">Đã thêm</p>
              </div>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} className="border-gray-300 text-gray-700">
            Hủy
          </Button>
          <Button
            onClick={handleAdd}
            disabled={!selected.size || adding}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {adding && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            Thêm {selected.size > 0 ? `${selected.size} tài liệu` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
