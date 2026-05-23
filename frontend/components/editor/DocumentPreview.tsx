"use client";

import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  QUOC_HUY, TIEU_NGU,
  VAN_BAN_TYPES,
  getFontStyle, getPageMargins,
  hasTenLoai, hasKinhGui, getTemplateForType,
  type Nd30Data,
} from "@/lib/nd30";

interface DocumentPreviewProps {
  data: Nd30Data;
  onClose: () => void;
}

export function DocumentPreview({ data, onClose }: DocumentPreviewProps) {
  const template    = getTemplateForType(data.loaiVanBan);
  const showTenLoai = hasTenLoai(template);
  const showKinhGui = hasKinhGui(template);
  const vbInfo      = VAN_BAN_TYPES[data.loaiVanBan];
  const showDoMat   = data.doMat !== "Thường";
  const showDoKhan  = data.doKhan !== "Thường";

  // Filter empty TipTap content
  const hasCanCu   = data.canCu && data.canCu !== "<p></p>" && data.canCu.trim() !== "";
  const noiDungHtml = data.noiDung || "";

  return (
    <div className="flex flex-col h-full">

      {/* ── Back bar ────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-card print:hidden">
        <Button variant="ghost" size="sm" onClick={onClose}>
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Quay lại soạn thảo
        </Button>
        <span className="text-xs text-muted-foreground select-none">
          Ctrl+Shift+P để thoát • Chỉ đọc
        </span>
      </div>

      {/* ── A4 scroll wrapper ───────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto bg-[#e5e7eb] py-6 print:bg-white print:p-0 print:overflow-visible">
        <div
          className="a4-page mx-auto bg-white shadow-lg print:shadow-none"
          style={{
            width: "210mm",
            minHeight: "297mm",
            ...getPageMargins(),
            fontFamily: "'Times New Roman', Times, serif",
            fontSize: "14pt",
            color: "#000",
            boxSizing: "border-box",
          }}
        >
          {/* ══ PHẦN 1+2 — Header 2 cột ═════════════════════════════ */}
          <div style={{ display: "grid", gridTemplateColumns: "45% 55%", gap: "4mm", marginBottom: "6mm" }}>

            {/* Cột trái: cơ quan + số/KH */}
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
                  <span style={{
                    display: "inline-block", border: "1px solid #000", padding: "2px 8px",
                    fontFamily: "'Times New Roman', serif", fontSize: "13pt",
                    fontWeight: "bold", textTransform: "uppercase",
                  }}>{data.doMat}</span>
                </div>
              )}
              {showDoKhan && (
                <div style={{ textAlign: "center", marginTop: "2mm" }}>
                  <span style={{
                    display: "inline-block", border: "1px solid #000", padding: "2px 8px",
                    fontFamily: "'Times New Roman', serif", fontSize: "13pt",
                    fontWeight: "bold", textTransform: "uppercase",
                  }}>{data.doKhan}</span>
                </div>
              )}
            </div>

            {/* Cột phải: quốc hiệu + địa danh/ngày */}
            <div>
              <div style={{
                ...getFontStyle("quoc_huy"),
                fontSize: "12pt",
                letterSpacing: "0.5px",
                whiteSpace: "nowrap",
                overflow: "visible",
              }}>
                {QUOC_HUY}
              </div>
              <div style={{ textAlign: "center", marginBottom: "4mm" }}>
                <span style={{
                  ...getFontStyle("tieu_ngu"),
                  display: "inline-block",
                  borderBottom: "1.5px solid #000",
                  paddingBottom: "2px",
                  whiteSpace: "nowrap",
                }}>
                  {TIEU_NGU}
                </span>
              </div>
              <div style={{ textAlign: "center" }}>
                <span style={{
                  ...getFontStyle("dia_danh_ngay"),
                  fontSize: "12pt",
                  whiteSpace: "nowrap",
                }}>
                  {[data.diaDanh, data.ngayThang].filter(Boolean).join(", ")}
                </span>
              </div>
            </div>
          </div>

          {/* ══ PHẦN 3 — Tên loại + trích yếu ══════════════════════ */}
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
              <span style={{ fontFamily: "'Times New Roman',serif", fontSize: "14pt", whiteSpace: "nowrap" }}>
                Kính gửi:
              </span>
              <span style={{ fontFamily: "'Times New Roman',serif", fontSize: "14pt" }}>
                {data.kinhGui}
              </span>
            </div>
          )}

          {/* ══ PHẦN 4 — Căn cứ (italic) ════════════════════════════ */}
          {hasCanCu && (
            <div
              className="nd30-preview"
              style={{
                marginBottom: "3mm",
                fontFamily: "'Times New Roman',serif",
                fontSize: "14pt",
                lineHeight: 1.6,
                fontStyle: "italic",
              }}
              dangerouslySetInnerHTML={{ __html: data.canCu }}
            />
          )}

          {/* ══ PHẦN 4 — Nội dung chính ═════════════════════════════ */}
          <div
            className="nd30-preview"
            style={{
              marginBottom: "6mm",
              fontFamily: "'Times New Roman',serif",
              fontSize: "14pt",
              lineHeight: 1.6,
              textAlign: "justify",
            }}
            dangerouslySetInnerHTML={{ __html: noiDungHtml }}
          />

          {/* ══ PHẦN 5 — Nơi nhận + Chữ ký ═════════════════════════ */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", marginTop: "4mm" }}>

            {/* Cột trái: nơi nhận */}
            <div style={{ paddingRight: "4mm" }}>
              <div style={getFontStyle("noi_nhan_label")}>Nơi nhận:</div>
              {(data.noiNhan ?? []).map((item, i) => (
                <div key={i} style={getFontStyle("noi_nhan_list")}>
                  {item.startsWith("-") ? item : `- ${item}`}
                </div>
              ))}
            </div>

            {/* Cột phải: chữ ký */}
            <div style={{ textAlign: "center", paddingLeft: "4mm" }}>
              <div style={{ ...getFontStyle("quyen_han_ky"), marginBottom: "2px" }}>
                {[data.quyenHanKy, data.chucDanhTapThe].filter(Boolean).join(" ")}
              </div>
              {data.chucVuKy && (
                <div style={getFontStyle("chuc_vu_ky")}>{data.chucVuKy}</div>
              )}
              <div style={{ height: "18mm" }} />
              {data.hoTenKy && (
                <div style={getFontStyle("ho_ten_ky")}>{data.hoTenKy}</div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
