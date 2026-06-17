"use client";

import {
  QUOC_HUY, TIEU_NGU,
  VAN_BAN_TYPES,
  getFontStyle,
  hasTenLoai, hasKinhGui, getTemplateForType,
  type Nd30Data,
} from "@/lib/nd30";

/**
 * Pure static (read-only) rendering of an Nd30Data document.
 * Used in DocumentPreviewPaged and as page 2+ overflow in nd30-document.
 * No interactive elements — safe to render multiple times with translateY.
 */
export function Nd30StaticContent({ data }: { data: Nd30Data }) {
  const isBlank     = !data.loaiVanBan;
  const template    = isBlank ? null : getTemplateForType(data.loaiVanBan);
  const showTenLoai = isBlank ? false : hasTenLoai(template!);
  const showKinhGui = isBlank ? false : hasKinhGui(template!);
  const vbInfo      = isBlank ? null : VAN_BAN_TYPES[data.loaiVanBan];
  const showDoMat   = data.doMat !== "Thường";
  const showDoKhan  = data.doKhan !== "Thường";
  const hasCanCu    = data.canCu && data.canCu !== "<p></p>" && data.canCu.trim() !== "";
  const noiDungHtml = data.noiDung || "";

  return (
    <>
      {/* ══ Header 2-cột ══════════════════════════════════════════════ */}
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
              <span style={{ display: "inline-block", border: "1px solid #000", padding: "2px 8px",
                fontFamily: "'Times New Roman', serif", fontSize: "13pt", fontWeight: "bold", textTransform: "uppercase" }}>
                {data.doMat}
              </span>
            </div>
          )}
          {showDoKhan && (
            <div style={{ textAlign: "center", marginTop: "2mm" }}>
              <span style={{ display: "inline-block", border: "1px solid #000", padding: "2px 8px",
                fontFamily: "'Times New Roman', serif", fontSize: "13pt", fontWeight: "bold", textTransform: "uppercase" }}>
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

      {/* ══ Tên loại + trích yếu ═════════════════════════════════════ */}
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

      {/* ══ Kính gửi ═════════════════════════════════════════════════ */}
      {showKinhGui && data.kinhGui && (
        <div style={{ marginBottom: "3mm", marginTop: "2mm", display: "flex", gap: "4px", alignItems: "flex-start" }}>
          <span style={{ fontFamily: "'Times New Roman',serif", fontSize: "14pt", whiteSpace: "nowrap" }}>Kính gửi:</span>
          <span style={{ fontFamily: "'Times New Roman',serif", fontSize: "14pt" }}>{data.kinhGui}</span>
        </div>
      )}

      {/* ══ Căn cứ ══════════════════════════════════════════════════ */}
      {hasCanCu && (
        <div className="nd30-preview"
          style={{ marginBottom: "3mm", fontFamily: "'Times New Roman',serif", fontSize: "14pt", lineHeight: 1.6, fontStyle: "italic" }}
          dangerouslySetInnerHTML={{ __html: data.canCu }} />
      )}

      {/* ══ Nội dung ════════════════════════════════════════════════ */}
      <div className="nd30-preview"
        style={{ marginBottom: "6mm", fontFamily: "'Times New Roman',serif", fontSize: "14pt", lineHeight: 1.6, textAlign: "justify" }}
        dangerouslySetInnerHTML={{ __html: noiDungHtml }} />

      {/* ══ Nơi nhận + Chữ ký ═══════════════════════════════════════ */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", marginTop: "4mm" }}>
        <div style={{ paddingRight: "4mm" }}>
          <div style={getFontStyle("noi_nhan_label")}>Nơi nhận:</div>
          {(Array.isArray(data.noiNhan) ? data.noiNhan : []).map((item, i) => (
            <div key={i} style={getFontStyle("noi_nhan_list")}>
              {item.startsWith("-") ? item : `- ${item}`}
            </div>
          ))}
        </div>
        <div style={{ textAlign: "center", paddingLeft: "4mm" }}>
          {(data.quyenHanKy || data.chucDanhTapThe) && (
            <div style={{ ...getFontStyle("quyen_han_ky"), marginBottom: "2px" }}>
              {[data.quyenHanKy, data.chucDanhTapThe].filter(Boolean).join(" ")}
            </div>
          )}
          {data.chucVuKy && <div style={getFontStyle("chuc_vu_ky")}>{data.chucVuKy}</div>}
          <div style={{ height: "18mm" }} />
          {data.hoTenKy && <div style={getFontStyle("ho_ten_ky")}>{data.hoTenKy}</div>}
        </div>
      </div>
    </>
  );
}
