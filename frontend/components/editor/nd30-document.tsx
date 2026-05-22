"use client";

import "./editor.css";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import Placeholder from "@tiptap/extension-placeholder";
import { EditorToolbar } from "./editor-toolbar";
import { Nd30Field } from "./nd30-field";
import {
  QUOC_HUY, TIEU_NGU, DIA_DANH_LIST,
  VAN_BAN_TYPES, VAN_BAN_TEMPLATES, QUYEN_HAN_KY,
  getFontStyle, getPageMargins, getSoKHFormat,
  getTemplateForType, hasTenLoai, hasKinhGui,
  defaultNd30Data,
  type Nd30Data,
} from "@/lib/nd30";
import { useState, useCallback, useEffect, useRef, type CSSProperties } from "react";
import { ChevronDown } from "lucide-react";

// ── Inline TipTap section ─────────────────────────────────────────────────

interface SectionEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder: string;
  minHeight?: string;
  italic?: boolean;
}

function SectionEditor({
  content, onChange, placeholder,
  minHeight = "80px", italic = false,
}: SectionEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Highlight,
      Placeholder.configure({ placeholder }),
    ],
    content,
    onUpdate({ editor }) { onChange(editor.getHTML()); },
    editorProps: {
      attributes: {
        class: "focus:outline-none",
        style: [
          `min-height:${minHeight}`,
          "font-family:'Times New Roman',Times,serif",
          "font-size:14pt",
          "line-height:1.6",
          "text-align:justify",
          italic ? "font-style:italic" : "",
        ].filter(Boolean).join(";"),
      },
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content]);

  return (
    <div className="relative group">
      <div className="mb-1 opacity-0 group-focus-within:opacity-100 transition-opacity print:hidden">
        <EditorToolbar editor={editor} />
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}

// ── Type selector ─────────────────────────────────────────────────────────

function TypeSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (loai: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 print:hidden">
      <span className="text-xs text-muted-foreground whitespace-nowrap">Loại văn bản:</span>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 pl-2 pr-7 text-xs rounded border border-input bg-background appearance-none focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
        >
          {Object.entries(VAN_BAN_TYPES).map(([key, vb]) => (
            <option key={key} value={key}>
              {vb.abbreviation} — {vb.full_name}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 pointer-events-none text-muted-foreground" />
      </div>
      <span className="text-xs text-muted-foreground">
        Mẫu {getTemplateForType(value).code}: {getTemplateForType(value).name}
      </span>
    </div>
  );
}

// ── Địa danh searchable dropdown ─────────────────────────────────────────

function DiaDanhSelect({
  value,
  onChange,
  style,
}: {
  value: string;
  onChange: (v: string) => void;
  style?: CSSProperties;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  const filtered = DIA_DANH_LIST.filter((d) =>
    d.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div ref={containerRef} style={{ position: "relative", display: "inline-block" }}>
      <div
        onClick={() => setOpen((o) => !o)}
        style={{ ...style, cursor: "pointer", whiteSpace: "nowrap" }}
        title="Click để chọn địa danh"
      >
        {value || (
          <span style={{ color: "#9ca3af", fontWeight: "normal", fontStyle: "italic", textTransform: "none" }}>
            Địa danh
          </span>
        )}
      </div>

      {open && (
        <div style={{
          position: "absolute",
          top: "calc(100% + 4px)",
          left: 0,
          zIndex: 200,
          background: "white",
          border: "1px solid #d1d5db",
          borderRadius: "6px",
          boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
          width: "220px",
          maxHeight: "260px",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}>
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm kiếm..."
            style={{
              padding: "6px 10px",
              fontSize: "12pt",
              border: "none",
              borderBottom: "1px solid #e5e7eb",
              outline: "none",
              fontFamily: "'Times New Roman', serif",
              flexShrink: 0,
            }}
          />
          <div style={{ overflowY: "auto", flex: 1 }}>
            {filtered.map((d) => (
              <div
                key={d}
                onMouseDown={() => { onChange(d); setOpen(false); setSearch(""); }}
                style={{
                  padding: "5px 10px",
                  cursor: "pointer",
                  fontSize: "12pt",
                  fontFamily: "'Times New Roman', serif",
                  background: d === value ? "#eff6ff" : "white",
                  fontWeight: d === value ? "bold" : "normal",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#f3f4f6"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = d === value ? "#eff6ff" : "white"; }}
              >
                {d}
              </div>
            ))}
            {filtered.length === 0 && (
              <div style={{ padding: "8px 10px", color: "#9ca3af", fontSize: "11pt", fontFamily: "'Times New Roman', serif" }}>
                Không tìm thấy
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export interface Nd30DocumentProps {
  initialData?: Partial<Nd30Data>;
  onChange?: (data: Nd30Data) => void;
}

export function Nd30Document({ initialData, onChange }: Nd30DocumentProps) {
  const [data, setData] = useState<Nd30Data>(() => ({
    ...defaultNd30Data(initialData?.loaiVanBan ?? "QĐ"),
    ...initialData,
  }));

  const quocHieuRef = useRef<HTMLDivElement>(null);

  // Auto-shrink quốc hiệu font nếu text tràn ra ngoài cột
  useEffect(() => {
    const el = quocHieuRef.current;
    if (!el) return;
    el.style.fontSize = "12pt";
    let size = 12;
    while (el.scrollWidth > el.clientWidth && size > 9) {
      size -= 0.5;
      el.style.fontSize = `${size}pt`;
    }
  }, []);

  // Initialize ngayThang on client only (avoids SSR hydration mismatch)
  useEffect(() => {
    if (!data.ngayThang) {
      const now  = new Date();
      const dd   = String(now.getDate()).padStart(2, "0");
      const mm   = String(now.getMonth() + 1).padStart(2, "0");
      const yyyy = now.getFullYear();
      setData((prev) => ({ ...prev, ngayThang: `ngày ${dd} tháng ${mm} năm ${yyyy}` }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const update = useCallback(<K extends keyof Nd30Data>(key: K, val: Nd30Data[K]) => {
    setData((prev) => {
      const next = { ...prev, [key]: val };
      onChange?.(next);
      return next;
    });
  }, [onChange]);

  const handleTypeChange = (loai: string) => {
    setData((prev) => {
      const next = { ...prev, loaiVanBan: loai, soKyHieu: "" };
      onChange?.(next);
      return next;
    });
  };

  const template    = getTemplateForType(data.loaiVanBan);
  const showTenLoai = hasTenLoai(template);
  const showKinhGui = hasKinhGui(template);
  const vbInfo      = VAN_BAN_TYPES[data.loaiVanBan];
  // Placeholder for soKyHieu — just the number/code part (without "Số:")
  const soKHHint    = getSoKHFormat(data.loaiVanBan)
    .replace("{so}", "15").replace("{nam}", "2025")
    .replace("{loai}", data.loaiVanBan).replace("{cq}", "CQ");

  return (
    <div className="flex flex-col h-full">

      {/* ── Top toolbar ─────────────────────────────────────── */}
      <div className="flex items-center gap-4 px-4 py-2 border-b bg-muted/30 print:hidden">
        <TypeSelector value={data.loaiVanBan} onChange={handleTypeChange} />
      </div>

      {/* ── A4 scroll wrapper ───────────────────────────────── */}
      <div className="flex-1 overflow-y-auto bg-[#e5e7eb] py-6 print:bg-white print:p-0">
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

          {/* ══ VÙNG A — THỂ THỨC ════════════════════════════════════════ */}

          {/* Header 2 cột: trái 42%, phải 58% để quốc hiệu đủ chỗ */}
          <div style={{ display: "grid", gridTemplateColumns: "42% 58%", marginBottom: "6mm" }}>

            {/* Cột trái: Ô 2 (tên CQ) + Ô 3 (số/KH) */}
            <div style={{ paddingRight: "4mm" }}>

              {/* Ô 2a: Tên CQ chủ quản — in hoa, KHÔNG đậm */}
              <Nd30Field
                value={data.coQuanChuQuan}
                onChange={(v) => update("coQuanChuQuan", v)}
                style={getFontStyle("co_quan_chu_quan")}
                placeholder="TÊN CƠ QUAN CHỦ QUẢN"
              />

              {/* Ô 2b: Tên CQ ban hành — in hoa, ĐẬM */}
              <Nd30Field
                value={data.coQuanBanHanh}
                onChange={(v) => update("coQuanBanHanh", v)}
                style={getFontStyle("co_quan_ban_hanh")}
                placeholder="TÊN CƠ QUAN BAN HÀNH"
              />

              {/* Đường kẻ ngang ~40-50% dòng chữ, căn giữa */}
              <div style={{
                height: "1.5px", background: "#000",
                width: "50%", margin: "2px auto 4px",
              }} />

              {/* Ô 3: Số/KH — inline để "Số:" và số hiệu nằm liền nhau */}
              <div style={{ textAlign: "center" }}>
                <span style={getFontStyle("so_ky_hieu")}>Số: </span>
                <Nd30Field
                  value={data.soKyHieu}
                  onChange={(v) => update("soKyHieu", v)}
                  style={{ ...getFontStyle("so_ky_hieu"), display: "inline", fontStyle: "italic" }}
                  placeholder={soKHHint}
                />
              </div>
            </div>

            {/* Cột phải: Ô 1 (quốc hiệu + tiêu ngữ) + Ô 4 (ngày tháng) */}
            <div style={{ paddingLeft: "4mm" }}>

              {/* Ô 1a: Quốc hiệu — nowrap + auto-shrink nếu tràn cột */}
              <div
                ref={quocHieuRef}
                style={{
                  ...getFontStyle("quoc_huy"),
                  fontSize: "12pt",
                  letterSpacing: "0.5px",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                }}
              >
                {QUOC_HUY}
              </div>

              {/* Ô 1b: Tiêu ngữ — inline-block + border-bottom thay cho gạch riêng */}
              <div style={{ textAlign: "center", marginBottom: "4mm" }}>
                <span style={{
                  ...getFontStyle("tieu_ngu"),
                  display: "inline-block",
                  borderBottom: "1.5px solid #000",
                  paddingBottom: "2px",
                }}>
                  {TIEU_NGU}
                </span>
              </div>

              {/* Ô 4: Địa danh (dropdown) + ngày tháng — 1 dòng liền, căn giữa */}
              <div style={{
                display: "flex", justifyContent: "center",
                alignItems: "baseline", gap: 0,
                whiteSpace: "nowrap",
              }}>
                <DiaDanhSelect
                  value={data.diaDanh}
                  onChange={(v) => update("diaDanh", v)}
                  style={getFontStyle("dia_danh_ngay")}
                />
                <span style={{ ...getFontStyle("dia_danh_ngay"), flexShrink: 0 }}>,&nbsp;</span>
                <Nd30Field
                  value={data.ngayThang}
                  onChange={(v) => update("ngayThang", v)}
                  style={{ ...getFontStyle("dia_danh_ngay"), textAlign: "left", whiteSpace: "nowrap" }}
                  placeholder="ngày ... tháng ... năm ..."
                />
              </div>
            </div>
          </div>

          {/* ── Ô 5a: Tên loại VB + trích yếu (VB có tên loại) ─────── */}
          {showTenLoai && (
            <div style={{ textAlign: "center", margin: "4mm 0 2mm" }}>
              <div style={getFontStyle("ten_loai_vb")}>
                {vbInfo?.full_name?.toUpperCase() ?? data.loaiVanBan}
              </div>
              <Nd30Field
                value={data.trichYeu}
                onChange={(v) => update("trichYeu", v)}
                style={getFontStyle("trich_yeu_co_ten_loai")}
                placeholder="Trích yếu nội dung văn bản"
              />
              {/* Đường kẻ 1/3–1/2 độ dài dòng, dưới trích yếu */}
              <div style={{
                height: "1.5px", background: "#000",
                width: "40%", margin: "3px auto 0",
              }} />
            </div>
          )}

          {/* ── Ô 5b: Trích yếu công văn (V/v) ─────────────────────── */}
          {!showTenLoai && (
            <div style={{ textAlign: "center", margin: "4mm 0 2mm" }}>
              <Nd30Field
                value={data.trichYeu}
                onChange={(v) => update("trichYeu", v)}
                style={getFontStyle("trich_yeu_cong_van")}
                placeholder="V/v ..."
              />
            </div>
          )}

          {/* ── Ô 9a: Kính gửi (chỉ CV, GGT) ───────────────────────── */}
          {showKinhGui && (
            <div style={{
              marginBottom: "3mm", marginTop: "2mm",
              display: "flex", gap: "4px", alignItems: "flex-start",
            }}>
              <span style={{
                fontFamily: "'Times New Roman',serif",
                fontSize: "14pt", whiteSpace: "nowrap",
              }}>
                Kính gửi:
              </span>
              <Nd30Field
                value={data.kinhGui}
                onChange={(v) => update("kinhGui", v)}
                style={{ fontFamily: "'Times New Roman',serif", fontSize: "14pt", flex: 1 }}
                placeholder="Tên cơ quan / cá nhân nhận"
                multiline
              />
            </div>
          )}

          {/* ══ VÙNG B — CĂN CỨ (italic) ════════════════════════════════ */}
          <div style={{ marginBottom: "3mm" }}>
            <SectionEditor
              content={data.canCu}
              onChange={(v) => update("canCu", v)}
              placeholder="Căn cứ [tên văn bản] số [số/KH] ngày ... tháng ... năm ... của [cơ quan] về ...;"
              minHeight="60px"
              italic
            />
          </div>

          {/* ══ VÙNG C — NỘI DUNG ════════════════════════════════════════ */}
          <div style={{ marginBottom: "6mm" }}>
            <SectionEditor
              content={data.noiDung}
              onChange={(v) => update("noiDung", v)}
              placeholder="Nội dung chính của văn bản..."
              minHeight="200px"
            />
          </div>

          {/* ══ PHẦN KÝ ══════════════════════════════════════════════════ */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", marginTop: "4mm" }}>

            {/* Cột trái: Nơi nhận (Ô 9b) */}
            <div style={{ paddingRight: "4mm" }}>
              <div style={getFontStyle("noi_nhan_label")}>Nơi nhận:</div>
              <Nd30Field
                value={data.noiNhan}
                onChange={(v) => update("noiNhan", v)}
                style={getFontStyle("noi_nhan_list")}
                placeholder={"- Như trên;\n- Lưu: VT."}
                multiline
              />
            </div>

            {/* Cột phải: Ký (Ô 7a/7b/7c) */}
            <div style={{ textAlign: "center", paddingLeft: "4mm" }}>

              {/* Ô 7a: Quyền hạn ký + tên tập thể trên 1 dòng */}
              {/* FIX 5: dropdown không chèn mũi tên giữa TM. và tên CQ */}
              <div style={{
                display: "flex", justifyContent: "center",
                alignItems: "baseline", gap: "4px", marginBottom: "2px",
              }}>
                {/* Screen: select với appearance:none, ChevronDown ở bên phải select */}
                <div className="print:hidden" style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
                  <select
                    value={data.quyenHanKy}
                    onChange={(e) => update("quyenHanKy", e.target.value)}
                    className="appearance-none"
                    style={{
                      fontFamily: "'Times New Roman',serif",
                      fontSize: "14pt",
                      fontWeight: "bold",
                      color: "#000",
                      background: "transparent",
                      border: "none",
                      outline: "none",
                      cursor: "pointer",
                      paddingRight: "14px",
                    }}
                  >
                    {Object.values(QUYEN_HAN_KY).map((v) => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                  <ChevronDown
                    className="pointer-events-none text-muted-foreground"
                    style={{ position: "absolute", right: 0, top: "50%", transform: "translateY(-50%)", width: "12px", height: "12px" }}
                  />
                </div>
                {/* Print: text tĩnh */}
                <span className="hidden print:inline" style={getFontStyle("quyen_han_ky")}>
                  {data.quyenHanKy}
                </span>
                {/* Tên tập thể lãnh đạo */}
                <Nd30Field
                  value={data.chucDanhTapThe}
                  onChange={(v) => update("chucDanhTapThe", v)}
                  style={getFontStyle("quyen_han_ky")}
                  placeholder="TÊN TẬP THỂ LÃNH ĐẠO"
                />
              </div>

              {/* Chức vụ người ký — in hoa đậm */}
              <Nd30Field
                value={data.chucVuKy}
                onChange={(v) => update("chucVuKy", v)}
                style={getFontStyle("chuc_vu_ky")}
                placeholder="CHỨC VỤ NGƯỜI KÝ"
              />

              {/* Khoảng chữ ký tay (~3–4 dòng) */}
              <div style={{ height: "18mm" }} />

              {/* Họ và tên — in thường đậm */}
              <Nd30Field
                value={data.hoTenKy}
                onChange={(v) => update("hoTenKy", v)}
                style={getFontStyle("ho_ten_ky")}
                placeholder="Họ và tên người ký"
              />
            </div>
          </div>

        </div>{/* end .a4-page */}
      </div>{/* end scroll wrapper */}
    </div>
  );
}
