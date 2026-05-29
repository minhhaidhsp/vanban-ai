"use client";

import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { suggestApi } from "@/lib/api";

interface CanCuItem {
  text: string;
  source_doc: string;
  so_ki_hieu: string | null;
  score: number;
  rerank_score: number;
}

interface CanCuSuggestPanelProps {
  isOpen: boolean;
  onClose: () => void;
  loaiVb: string;
  trichYeu: string;
  onApply: (selectedTexts: string[]) => void;
}

export function CanCuSuggestPanel({
  isOpen, onClose, loaiVb, trichYeu, onApply,
}: CanCuSuggestPanelProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<CanCuItem[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!isOpen) { setSearch(""); return; }
    setSelected([]);
    setSuggestions([]);
    setIsLoading(true);
    suggestApi.getCanCu(loaiVb, trichYeu)
      .then((res) => setSuggestions(res.items))
      .catch(() => setSuggestions([]))
      .finally(() => setIsLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const toggleItem = (text: string) => {
    setSelected((prev) =>
      prev.includes(text) ? prev.filter((t) => t !== text) : [...prev, text]
    );
  };

  const filteredSuggestions = suggestions.filter((item) =>
    item.text.toLowerCase().includes(search.toLowerCase()) ||
    item.source_doc.toLowerCase().includes(search.toLowerCase())
  );

  const handleApply = () => {
    onApply(selected);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl" style={{ maxHeight: "80vh", overflowY: "auto" }}>
        <DialogHeader>
          <DialogTitle>✨ Gợi ý căn cứ pháp lý</DialogTitle>
          <DialogDescription>
            AI tìm kiếm từ kho văn bản của bạn
          </DialogDescription>
        </DialogHeader>

        {/* Search box */}
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
            🔍
          </span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm trong gợi ý..."
            className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        {/* Suggestions list */}
        <div className="max-h-64 overflow-y-auto">
          {isLoading && (
            <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
              <span className="animate-spin inline-block">⟳</span>
              Đang tìm căn cứ từ kho văn bản...
            </div>
          )}

          {!isLoading && filteredSuggestions.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase text-muted-foreground tracking-wide mb-2">
                Gợi ý ({filteredSuggestions.length}{search ? ` trong ${suggestions.length}` : ""})
              </p>
              {filteredSuggestions.map((item, i) => (
                <label
                  key={i}
                  className="flex items-start gap-2 p-2 rounded-lg hover:bg-gray-50 cursor-pointer overflow-hidden"
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(item.text)}
                    onChange={() => toggleItem(item.text)}
                    className="mt-0.5 flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <p
                      className="text-sm"
                      style={{
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                        wordBreak: "break-all",
                      }}
                      title={item.text}
                    >
                      {item.text}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {item.source_doc}
                      {item.so_ki_hieu && ` · ${item.so_ki_hieu}`}
                      {" · "}
                      <span className="text-purple-500">
                        {Math.round(item.rerank_score * 100)}% khớp
                      </span>
                    </p>
                  </div>
                </label>
              ))}
            </div>
          )}

          {!isLoading && filteredSuggestions.length === 0 && search && (
            <p className="text-sm text-muted-foreground text-center py-3">
              Không tìm thấy căn cứ phù hợp với &ldquo;{search}&rdquo;
            </p>
          )}

          {!isLoading && suggestions.length === 0 && !search && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Không tìm thấy căn cứ phù hợp trong kho.
              <br />
              Thêm văn bản vào kho để có gợi ý tốt hơn.
            </p>
          )}
        </div>

        {/* Selected items */}
        {selected.length > 0 && (
          <div className="border-t pt-3">
            <p className="text-xs font-medium uppercase text-muted-foreground tracking-wide mb-2">
              Đã chọn ({selected.length})
            </p>
            <div className="space-y-1">
              {selected.map((text, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 p-2 bg-purple-50 border border-purple-100 rounded-lg overflow-hidden"
                >
                  <span className="text-xs text-purple-400 flex-shrink-0 w-4">{i + 1}.</span>
                  <span
                    className="flex-1 text-sm"
                    style={{
                      wordBreak: "break-word",
                      whiteSpace: "normal",
                    }}
                    title={text}
                  >
                    {text}
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleItem(text)}
                    className="text-red-400 hover:text-red-600 flex-shrink-0 text-xs px-1"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Hủy</Button>
          <Button
            onClick={handleApply}
            disabled={selected.length === 0}
            className="bg-purple-600 hover:bg-purple-700"
          >
            Áp dụng ({selected.length} căn cứ)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
