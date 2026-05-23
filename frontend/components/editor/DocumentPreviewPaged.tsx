"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  QUOC_HUY, TIEU_NGU,
  VAN_BAN_TYPES,
  getFontStyle,
  hasTenLoai, hasKinhGui, getTemplateForType,
  type Nd30Data,
} from "@/lib/nd30";

// ── NĐ 30 page geometry (mm) ──────────────────────────────────────────────────
const PAGE_H   = 297;
const MARGIN_T = 25;
const MARGIN_B = 25;
const MARGIN_L = 30;
const MARGIN_R = 20;
const CONTENT_H = PAGE_H - MARGIN_T - MARGIN_B; // 247mm per page

// ── Shared document body (rendered twice: once hidden to measure, once per page)
function Nd30DocContent({ data }: { data: Nd30Data }) {
  const template    = getTemplateForType(data.loaiVanBan);
  const showTenLoai = hasTenLoai(template);
  const showKinhGui = hasKinhGui(template);
  const vbInfo      = VAN_BAN_TYPES[data.loaiVanBan];
  const showDoMat   = data.doMat !== "Thường";
  const showDoKhan  = data.doKhan !== "Thường";
  const hasCanCu    = data.canCu && data.canCu !== "<p></p>" && data.canCu.trim() !== "";
  const noiDungHtml = data.noiDung || "";

  return (
    <>
      {/* ══ PHẦN 1+2 — Header ══════════════════════════════════════ */}
      <div style={{ display: "grid", gridTemplateColumns: "45% 55%", gap: "4mm", marginBottom: "6mm" }}>
        <div>
          {data.coQuanChuQuan && (
            <div style={getFontStyle("co_quan_chu_quan")}>{data.coQuanChuQuan}</div>
          )}
          <div style={getFontStyle("co_quan_ban_hanh")}>{data.coQuanBanHanh || ""}</div>
          <div style={{ height: "1.5px", background: "#000", width: "50%", margin: "2px auto 4px" }} />
          <div style={{ textAlign: "center" }}>
            <span style={getFontStyle("so_ky_hieu")}>Số:&nbsp;</span>
            <span style={{ ...getFontStyle("so_ky_hieu"), fontStyle: "italic" }}>
              {data.soKyHieu || ""}
            </span>
          </div>
          {showDoMat && (
            <div style={{ textAlign: "center", marginTop: "3mm" }}>
              <span style={{ display: "inline-block", border: "1px solid #000", padding: "2px 8px", fontFamily: "'Times New Roman', serif", fontSize: "13pt", fontWeight: "bold", textTransform: "uppercase" }}>
                {data.doMat}
              </span>
            </div>
          )}
          {showDoKhan && (
            <div style={{ textAlign: "center", marginTop: "2mm" }}>
              <span style={{ display: "inline-block", border: "1px solid #000", padding: "2px 8px", fontFamily: "'Times New Roman', serif", fontSize: "13pt", fontWeight: "bold", textTransform: "uppercase" }}>
                {data.doKhan}
              </span>
            </div>
          )}
        </div>

        <div>
          <div style={{ ...getFontStyle("quoc_huy"), fontSize: "12pt", letterSpacing: "0.5px", whiteSpace: "nowrap", overflow: "visible" }}>
            {QUOC_HUY}
          </div>
          <div style={{ textAlign: "center", marginBottom: "4mm" }}>
            <span style={{ ...getFontStyle("tieu_ngu"), display: "inline-block", borderBottom: "1.5px solid #000", paddingBottom: "2px", whiteSpace: "nowrap" }}>
              {TIEU_NGU}
            </span>
          </div>
          <div style={{ textAlign: "center" }}>
            <span style={{ ...getFontStyle("dia_danh_ngay"), fontSize: "12pt", whiteSpace: "nowrap" }}>
              {[data.diaDanh, data.ngayThang].filter(Boolean).join(", ")}
            </span>
          </div>
        </div>
      </div>

      {/* ══ PHẦN 3 — Tên loại + trích yếu ══════════════════════════ */}
      {showTenLoai && (
        <div style={{ textAlign: "center", margin: "4mm 0 2mm" }}>
          <div style={getFontStyle("ten_loai_vb")}>
            {vbInfo?.full_name?.toUpperCase() ?? data.loaiVanBan}
          </div>
          <div style={getFontStyle("trich_yeu_co_ten_loai")}>{data.trichYeu || ""}</div>
          <div style={{ height: "1.5px", background: "#000", width: "40%", margin: "3px auto 0" }} />
        </div>
      )}
      {!showTenLoai && (
        <div style={{ textAlign: "center", margin: "4mm 0 2mm" }}>
          <div style={getFontStyle("trich_yeu_cong_van")}>{data.trichYeu || ""}</div>
        </div>
      )}

      {/* Kính gửi */}
      {showKinhGui && data.kinhGui && (
        <div style={{ marginBottom: "3mm", marginTop: "2mm", display: "flex", gap: "4px", alignItems: "flex-start" }}>
          <span style={{ fontFamily: "'Times New Roman',serif", fontSize: "14pt", whiteSpace: "nowrap" }}>Kính gửi:</span>
          <span style={{ fontFamily: "'Times New Roman',serif", fontSize: "14pt" }}>{data.kinhGui}</span>
        </div>
      )}

      {/* ══ PHẦN 4a — Căn cứ ════════════════════════════════════════ */}
      {hasCanCu && (
        <div className="nd30-preview" style={{ marginBottom: "3mm", fontFamily: "'Times New Roman',serif", fontSize: "14pt", lineHeight: 1.6, fontStyle: "italic" }}
          dangerouslySetInnerHTML={{ __html: data.canCu }} />
      )}

      {/* ══ PHẦN 4b — Nội dung ══════════════════════════════════════ */}
      <div className="nd30-preview" style={{ marginBottom: "6mm", fontFamily: "'Times New Roman',serif", fontSize: "14pt", lineHeight: 1.6, textAlign: "justify" }}
        dangerouslySetInnerHTML={{ __html: noiDungHtml }} />

      {/* ══ PHẦN 5 — Nơi nhận + Chữ ký ═════════════════════════════ */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", marginTop: "4mm" }}>
        <div style={{ paddingRight: "4mm" }}>
          <div style={getFontStyle("noi_nhan_label")}>Nơi nhận:</div>
          {(data.noiNhan ?? []).map((item, i) => (
            <div key={i} style={getFontStyle("noi_nhan_list")}>
              {item.startsWith("-") ? item : `- ${item}`}
            </div>
          ))}
        </div>
        <div style={{ textAlign: "center", paddingLeft: "4mm" }}>
          <div style={{ ...getFontStyle("quyen_han_ky"), marginBottom: "2px" }}>
            {[data.quyenHanKy, data.chucDanhTapThe].filter(Boolean).join(" ")}
          </div>
          {data.chucVuKy && <div style={getFontStyle("chuc_vu_ky")}>{data.chucVuKy}</div>}
          <div style={{ height: "18mm" }} />
          {data.hoTenKy && <div style={getFontStyle("ho_ten_ky")}>{data.hoTenKy}</div>}
        </div>
      </div>
    </>
  );
}

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
  exporting?: boolean;
}

export function DocumentPreviewPaged({ data, onClose, onExportPdf, exporting }: DocumentPreviewPagedProps) {
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
          {onExportPdf && (
            <Button variant="outline" size="sm" onClick={onExportPdf} disabled={exporting}>
              {exporting
                ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                : <Download className="h-3.5 w-3.5 mr-1.5" />}
              Xuất PDF
            </Button>
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
          <Nd30DocContent data={data} />
        </div>

        {/* Rendered A4 pages ─────────────────────────────────── */}
        <div className="flex flex-col items-center gap-[8mm]">
          {Array.from({ length: numPages }, (_, pageIdx) => (
            <div
              key={pageIdx}
              className="bg-white shadow-lg"
              style={{
                width: `${210}mm`,
                height: `${PAGE_H}mm`,
                position: "relative",
                flexShrink: 0,
                overflow: "hidden",
              }}
            >
              {/*
               * Inner clip zone: sits at exactly the content area
               *   top:    MARGIN_T  (25mm) — creates top margin
               *   height: CONTENT_H (247mm) — clips at bottom of content area
               * The remaining (PAGE_H - MARGIN_T - CONTENT_H) = 25mm below stays
               * empty, creating the bottom margin.
               */}
              <div
                style={{
                  position: "absolute",
                  top: `${MARGIN_T}mm`,
                  left: `${MARGIN_L}mm`,
                  right: `${MARGIN_R}mm`,
                  height: `${CONTENT_H}mm`,
                  overflow: "hidden",
                }}
              >
                {/* Shift content up to show the Nth page slice */}
                <div style={{ transform: `translateY(${-pageIdx * CONTENT_H}mm)`, ...CONTENT_STYLE }}>
                  <Nd30DocContent data={data} />
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
