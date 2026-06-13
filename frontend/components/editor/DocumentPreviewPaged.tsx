"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ChevronDown, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { type Nd30Data } from "@/lib/nd30";
import { Nd30StaticContent } from "./nd30-static-content";

// ── NĐ 30 page geometry (mm) ──────────────────────────────────────────────────
const PAGE_H   = 297;
const MARGIN_T = 25;
const MARGIN_B = 25;
const MARGIN_L = 30;
const MARGIN_R = 20;
const CONTENT_H = PAGE_H - MARGIN_T - MARGIN_B; // 247mm per page


// ── Shared content style ───────────────────────────────────────────────────────
const CONTENT_STYLE: React.CSSProperties = {
  fontFamily: "'Times New Roman', Times, serif",
  fontSize: "14pt",
  color: "#000",
};

// ── Main export ───────────────────────────────────────────────────────────────
interface DocumentPreviewPagedProps {
  data: Nd30Data;
  onClose: () => void;
  onExportPdf?: () => void;
  onExportDocx?: () => void;
  exporting?: boolean;
}

export function DocumentPreviewPaged({ data, onClose, onExportPdf, onExportDocx, exporting }: DocumentPreviewPagedProps) {
  const [numPages, setNumPages] = useState(1);
  const measureRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = measureRef.current;
    if (!el) return;

    const recalc = () => {
      const h = el.scrollHeight;
      const pageContentPx = CONTENT_H * (96 / 25.4);
      setNumPages(Math.max(1, Math.ceil(h / pageContentPx)));
    };

    const ro = new ResizeObserver(recalc);
    ro.observe(el);
    recalc();
    return () => ro.disconnect();
  }, [data]);

  return (
    <div className="flex flex-col h-full">

      {/* ── Top bar ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-end px-4 py-2 border-b bg-card print:hidden">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
            Quay lại soạn thảo
          </Button>
          {(onExportPdf || onExportDocx) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={exporting}>
                  {exporting
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                    : <Download className="h-3.5 w-3.5 mr-1.5" />}
                  Tải xuống
                  <ChevronDown className="h-3 w-3 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onExportDocx && (
                  <DropdownMenuItem onClick={onExportDocx}>Tải DOCX</DropdownMenuItem>
                )}
                {onExportPdf && (
                  <DropdownMenuItem onClick={onExportPdf}>Tải PDF</DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* ── A4 scroll area ──────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto bg-[#e5e7eb] py-6">

        {/* Hidden measurement div — off-screen, content-area width only */}
        <div
          ref={measureRef}
          aria-hidden
          style={{
            position: "fixed", left: "-9999px", top: 0,
            visibility: "hidden", pointerEvents: "none",
            width: `${210 - MARGIN_L - MARGIN_R}mm`,
            ...CONTENT_STYLE,
          }}
        >
          <Nd30StaticContent data={data} />
        </div>

        {/* Rendered A4 pages ─────────────────────────────────── */}
        <div className="flex flex-col items-center" style={{ gap: "8mm" }}>
          {Array.from({ length: numPages }, (_, pageIdx) => (
            <div
              key={pageIdx}
              style={{
                width: "210mm",
                height: "297mm",
                background: "white",
                boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                position: "relative",
                overflow: "hidden",
                flexShrink: 0,
              }}
            >
              {/* Content wrapper với padding lề trang */}
              <div
                style={{
                  position: "absolute",
                  top: `${MARGIN_T}mm`,
                  left: `${MARGIN_L}mm`,
                  right: `${MARGIN_R}mm`,
                  bottom: `${MARGIN_B}mm`,
                  overflow: "hidden",
                }}
              >
                {/* Dịch chuyển lên để hiện đúng trang */}
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    transform: `translateY(${-pageIdx * CONTENT_H}mm)`,
                    ...CONTENT_STYLE,
                  }}
                >
                  <Nd30StaticContent data={data} />
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
