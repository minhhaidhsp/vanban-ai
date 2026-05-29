"use client";

import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { suggestApi } from "@/lib/api";

interface HistoryItem {
  trich_yeu: string;
  loai_van_ban: string;
  used_count: number;
  last_used_at: string | null;
}

interface TrichYeuSuggestPanelProps {
  isOpen: boolean;
  onClose: () => void;
  loaiVb: string;       // display name for AI suggest ("Quyết định")
  loaiVbRaw: string;    // abbreviation for history lookup ("QĐ")
  currentTrichYeu: string;
  onSelect: (trichYeu: string) => void;
}

export function TrichYeuSuggestPanel({
  isOpen, onClose, loaiVb, loaiVbRaw, currentTrichYeu, onSelect,
}: TrichYeuSuggestPanelProps) {
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [manualInput, setManualInput] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setSearch("");
      return;
    }
    setManualInput(currentTrichYeu || "");
    setHistoryItems([]);
    setAiSuggestions([]);

    // Load history and AI suggestions in parallel
    setHistoryLoading(true);
    suggestApi.getTrichYeuHistory(loaiVbRaw, "", 10)
      .then((res) => setHistoryItems(res.items))
      .catch(() => setHistoryItems([]))
      .finally(() => setHistoryLoading(false));

    setAiLoading(true);
    suggestApi.getTrichYeu(loaiVb, currentTrichYeu)
      .then((res) => setAiSuggestions(res.suggestions))
      .catch(() => setAiSuggestions([]))
      .finally(() => setAiLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const lc = search.toLowerCase();
  const filteredHistory = historyItems.filter((h) =>
    h.trich_yeu.toLowerCase().includes(lc)
  );
  const filteredAi = aiSuggestions.filter((s) =>
    s.toLowerCase().includes(lc)
  );

  const handleSelect = (value: string) => {
    onSelect(value);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg" style={{ maxHeight: "85vh", overflowY: "auto" }}>
        <DialogHeader>
          <DialogTitle>✨ Gợi ý trích yếu</DialogTitle>
          <DialogDescription>
            Chọn một gợi ý hoặc nhập thủ công
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
            placeholder="Tìm kiếm trích yếu..."
            className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        {/* Section 1: History */}
        <div>
          <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide mb-2 flex items-center gap-1">
            <span>🕐</span>
            {historyLoading ? "Đang tải lịch sử..." : `Đã dùng trước đây (${filteredHistory.length})`}
          </p>

          {historyLoading && (
            <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
              <span className="animate-spin inline-block">⟳</span>
              Đang tải...
            </div>
          )}

          {!historyLoading && filteredHistory.length === 0 && !search && (
            <p className="text-xs text-muted-foreground text-center py-2">
              Chưa có lịch sử cho loại văn bản này
            </p>
          )}

          {!historyLoading && filteredHistory.map((h, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSelect(h.trich_yeu)}
              className="w-full text-left px-3 py-2 rounded-lg hover:bg-blue-50 hover:text-blue-700 text-sm border border-transparent hover:border-blue-200 transition-colors mb-1 flex items-center justify-between gap-2"
            >
              <span className="flex-1" style={{ wordBreak: "break-word", whiteSpace: "normal" }}>
                {h.trich_yeu}
              </span>
              <span className="flex-shrink-0 text-xs bg-blue-100 text-blue-600 rounded-full px-1.5 py-0.5 font-medium">
                ×{h.used_count}
              </span>
            </button>
          ))}
        </div>

        {/* Section 2: AI suggestions */}
        <div className="border-t pt-3">
          <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide mb-2 flex items-center gap-1">
            <span>✨</span>
            {aiLoading ? "AI đang tạo gợi ý..." : `Gợi ý từ AI (${filteredAi.length})`}
          </p>

          {aiLoading && (
            <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
              <span className="animate-spin inline-block">⟳</span>
              AI đang tạo gợi ý...
            </div>
          )}

          {!aiLoading && filteredAi.map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSelect(s)}
              className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-purple-50 hover:text-purple-700 text-sm border border-transparent hover:border-purple-200 transition-colors mb-1"
            >
              {s}
            </button>
          ))}

          {!aiLoading && filteredAi.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-2">
              {search ? "Không tìm thấy gợi ý AI" : "Không có gợi ý AI"}
            </p>
          )}
        </div>

        {/* Manual input */}
        <div className="border-t pt-3">
          <p className="text-xs font-medium uppercase text-muted-foreground tracking-wide mb-2">
            Hoặc nhập thủ công
          </p>
          <div className="flex gap-2">
            <input
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && manualInput.trim()) {
                  handleSelect(manualInput.trim());
                }
              }}
              placeholder="Nhập trích yếu..."
              className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <Button
              type="button"
              onClick={() => {
                if (manualInput.trim()) handleSelect(manualInput.trim());
              }}
              disabled={!manualInput.trim()}
              className="bg-purple-600 hover:bg-purple-700 flex-shrink-0"
            >
              Dùng
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
