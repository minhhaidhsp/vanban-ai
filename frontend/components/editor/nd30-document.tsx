"use client";

import "./editor.css";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import Placeholder from "@tiptap/extension-placeholder";
import { sharedExtensions } from "./extensions";
import { EditorToolbar } from "./editor-toolbar";
import { Nd30Field } from "./nd30-field";
import { RecipientTagInput } from "./recipient-tag-input";
import {
  QUOC_HUY, TIEU_NGU, DIA_DANH_LIST,
  DO_MAT_OPTIONS, DO_KHAN_OPTIONS,
  VAN_BAN_TYPES, QUYEN_HAN_KY,
  getFontStyle, getPageMargins, getSoKHFormat, generateSoKH,
  getTemplateForType, hasTenLoai, hasKinhGui,
  defaultNd30Data,
  type Nd30Data,
} from "@/lib/nd30";
import { organizationApi, documentApi, suggestApi } from "@/lib/api";
import { CanCuSuggestPanel } from "./CanCuSuggestPanel";
import { TrichYeuSuggestPanel } from "./TrichYeuSuggestPanel";
import { useState, useCallback, useEffect, useRef, type CSSProperties } from "react";
import { ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// ── TipTap section editor ─────────────────────────────────────────────────

interface SectionEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder: string;
  minHeight?: string;
  italic?: boolean;
  isActive?: boolean;
  onEditorFocused?: (editor: Editor) => void;
}

function SectionEditor({
  content, onChange, placeholder,
  minHeight = "80px", italic = false,
  isActive = false,
  onEditorFocused,
}: SectionEditorProps) {
  const editor = useEditor({
    extensions: [
      ...sharedExtensions,
      Placeholder.configure({ placeholder }),
    ],
    content,
    onUpdate({ editor }) { onChange(editor.getHTML()); },
    onFocus({ editor }) { onEditorFocused?.(editor); },
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
    <div className={`relative rounded transition-colors print:rounded-none ${
      isActive ? "ring-2 ring-blue-400 ring-offset-1" : ""
    }`}>
      <EditorContent editor={editor} />
    </div>
  );
}

// ── Type selector ─────────────────────────────────────────────────────────

function TypeSelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2 print:hidden">
      <span className="text-xs text-muted-foreground whitespace-nowrap">Loại VB:</span>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 pl-2 pr-7 text-xs rounded border border-input bg-background appearance-none focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
        >
          {Object.entries(VAN_BAN_TYPES).map(([key, vb]) => (
            <option key={key} value={key}>{vb.abbreviation} — {vb.full_name}</option>
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

// ── Địa danh searchable dropdown ──────────────────────────────────────────

function DiaDanhSelect({ value, onChange, style }: {
  value: string; onChange: (v: string) => void; style?: CSSProperties;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false); setSearch("");
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
        {value || <span style={{ color: "#9ca3af", fontWeight: "normal", fontStyle: "italic", textTransform: "none" }}>Địa danh</span>}
      </div>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, zIndex: 200,
          background: "white", border: "1px solid #d1d5db", borderRadius: "6px",
          boxShadow: "0 4px 16px rgba(0,0,0,0.12)", width: "220px",
          maxHeight: "260px", display: "flex", flexDirection: "column", overflow: "hidden",
        }}>
          <input
            autoFocus value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm kiếm..."
            style={{ padding: "6px 10px", fontSize: "12pt", border: "none",
              borderBottom: "1px solid #e5e7eb", outline: "none",
              fontFamily: "'Times New Roman', serif", flexShrink: 0 }}
          />
          <div style={{ overflowY: "auto", flex: 1 }}>
            {filtered.map((d) => (
              <div key={d}
                onMouseDown={() => { onChange(d); setOpen(false); setSearch(""); }}
                style={{ padding: "5px 10px", cursor: "pointer", fontSize: "12pt",
                  fontFamily: "'Times New Roman', serif",
                  background: d === value ? "#eff6ff" : "white",
                  fontWeight: d === value ? "bold" : "normal" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#f3f4f6"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = d === value ? "#eff6ff" : "white"; }}
              >{d}</div>
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

// ── Page-break visual overlay ─────────────────────────────────────────────

// Map abbreviation key → full display name cho suggest API
const getLoaiVbDisplay = (loaiVb: string) =>
  VAN_BAN_TYPES[loaiVb]?.full_name || loaiVb || "Quyết định";

// ── Main component ────────────────────────────────────────────────────────

export interface Nd30DocumentProps {
  initialData?: Partial<Nd30Data>;
  onChange?: (data: Nd30Data) => void;
  isNew?: boolean;
}

export function Nd30Document({ initialData, onChange, isNew = false }: Nd30DocumentProps) {
  const [data, setData] = useState<Nd30Data>(() => ({
    ...defaultNd30Data(initialData?.loaiVanBan ?? "QĐ"),
    ...initialData,
  }));

  const quocHieuRef = useRef<HTMLDivElement>(null);

  // AI suggest state
  const [trichYeuPanelOpen, setTrichYeuPanelOpen] = useState(false);
  const [soKySuggesting, setSoKySuggesting] = useState(false);
  const [canCuPanelOpen, setCanCuPanelOpen] = useState(false);
  const { toast } = useToast();

  // Shared TipTap toolbar state
  const [activeEditor, setActiveEditor] = useState<Editor | null>(null);
  const [activeFieldId, setActiveFieldId] = useState<string>("");

  const handleEditorFocused = useCallback((fieldId: string, editor: Editor) => {
    setActiveEditor(editor);
    setActiveFieldId(fieldId);
  }, []);

  // Auto-shrink quốc hiệu nếu tràn cột
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

  // Initialize ngayThang on client
  useEffect(() => {
    if (!data.ngayThang) {
      const now = new Date();
      const dd   = String(now.getDate()).padStart(2, "0");
      const mm   = String(now.getMonth() + 1).padStart(2, "0");
      const yyyy = now.getFullYear();
      setData((prev) => ({ ...prev, ngayThang: `ngày ${dd} tháng ${mm} năm ${yyyy}` }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-fill từ organization API (chỉ khi tạo mới)
  useEffect(() => {
    if (!isNew) return;
    organizationApi.getCurrent()
      .then((org) => {
        setData((prev) => ({
          ...prev,
          coQuanChuQuan: prev.coQuanChuQuan || org.ten_chu_quan,
          coQuanBanHanh: prev.coQuanBanHanh || org.ten_co_quan,
          diaDanh: prev.diaDanh || org.dia_danh,
          quyenHanKy: prev.quyenHanKy || org.chu_ky_mac_dinh?.quyen_han || "TM.",
          chucDanhTapThe: prev.chucDanhTapThe || org.chu_ky_mac_dinh?.ten_tap_the || "",
          chucVuKy: prev.chucVuKy || org.chu_ky_mac_dinh?.chuc_vu || "",
          _orgVietTat: org.viet_tat,
        } as Nd30Data & { _orgVietTat: string }));
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNew]);

  // Auto-number soKyHieu (chỉ khi tạo mới và chưa có số)
  useEffect(() => {
    if (!isNew || data.soKyHieu) return;
    const loai = data.loaiVanBan;
    documentApi.nextNumber(loai)
      .then(({ so, nam }) => {
        const orgVietTat = (data as Nd30Data & { _orgVietTat?: string })._orgVietTat || "CQ";
        const soKH = generateSoKH(loai, so, nam, orgVietTat);
        setData((prev) => ({ ...prev, soKyHieu: prev.soKyHieu || soKH }));
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNew, data.loaiVanBan, data.coQuanBanHanh]);

  const update = useCallback(<K extends keyof Nd30Data>(key: K, val: Nd30Data[K]) => {
    setData((prev) => {
      const next = { ...prev, [key]: val };
      onChange?.(next);
      return next;
    });
  }, [onChange]);

  const handleSuggestTrichYeu = () => {
    setTrichYeuPanelOpen(true);
  };

  const handleSuggestSoKyHieu = async () => {
    console.log('loaiVanBan raw:', data.loaiVanBan);
    console.log('loaiVbDisplay:', getLoaiVbDisplay(data.loaiVanBan));
    setSoKySuggesting(true);
    try {
      const res = await suggestApi.getSoKiHieu(
        getLoaiVbDisplay(data.loaiVanBan),
        data.coQuanBanHanh || ""
      );
      update("soKyHieu", res.so_ki_hieu);
    } catch (e) {
      console.error("[suggest] so_ki_hieu:", e);
      toast({ title: "Lỗi khi gợi ý số/ký hiệu", variant: "destructive" });
    } finally {
      setSoKySuggesting(false);
    }
  };

  const handleApplyCanCu = (selectedTexts: string[]) => {
    if (!selectedTexts.length) return;
    const newHtml = selectedTexts.map((t) => `<p>${t};</p>`).join("");
    const current = data.canCu || "";
    const isEmpty = !current || current === "<p></p>";
    update("canCu", isEmpty ? newHtml : current + newHtml);
  };

  const handleAIFillAll = async () => {
    await handleSuggestSoKyHieu();
    if (!data.trichYeu) {
      setTrichYeuPanelOpen(true);
    }
    setCanCuPanelOpen(true);
  };

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
  const soKHHint    = getSoKHFormat(data.loaiVanBan)
    .replace("{so}", "15").replace("{nam}", "2025")
    .replace("{loai}", data.loaiVanBan).replace("{cq}", "CQ");

  const showDoMat  = data.doMat !== "Thường";
  const showDoKhan = data.doKhan !== "Thường";

  return (
    <div className="flex flex-col h-full">

      {/* ── Top toolbar ───────────────────────────────────────── */}
      <div className="flex items-center gap-4 px-4 py-2 border-b bg-muted/30 print:hidden">
        <TypeSelector value={data.loaiVanBan} onChange={handleTypeChange} />

        {/* Độ mật */}
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground">Độ mật:</span>
          <div className="relative">
            <select
              value={data.doMat}
              onChange={(e) => update("doMat", e.target.value)}
              className="h-7 pl-2 pr-6 text-xs rounded border border-input bg-background appearance-none focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
            >
              {DO_MAT_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
            <ChevronDown className="absolute right-1 top-1/2 -translate-y-1/2 h-3 w-3 pointer-events-none text-muted-foreground" />
          </div>
        </div>

        {/* Độ khẩn */}
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground">Độ khẩn:</span>
          <div className="relative">
            <select
              value={data.doKhan}
              onChange={(e) => update("doKhan", e.target.value)}
              className="h-7 pl-2 pr-6 text-xs rounded border border-input bg-background appearance-none focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
            >
              {DO_KHAN_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
            <ChevronDown className="absolute right-1 top-1/2 -translate-y-1/2 h-3 w-3 pointer-events-none text-muted-foreground" />
          </div>
        </div>

        {/* AI Gợi ý */}
        <div className="ml-auto flex items-center gap-1 border-l pl-3">
          <span className="text-xs text-muted-foreground whitespace-nowrap">AI:</span>

          {/* Trích yếu */}
          <button
            type="button"
            onClick={handleSuggestTrichYeu}
            title="AI gợi ý trích yếu"
            className="flex items-center gap-1 px-2 py-1 text-xs rounded text-purple-600 hover:bg-purple-50 transition-colors whitespace-nowrap"
          >
            ✨ Trích yếu
          </button>

          {/* Số/KH */}
          <button
            type="button"
            onClick={handleSuggestSoKyHieu}
            disabled={soKySuggesting}
            title="AI gợi ý số/ký hiệu theo NĐ30"
            className="flex items-center gap-1 px-2 py-1 text-xs rounded text-purple-600 hover:bg-purple-50 disabled:opacity-40 transition-colors whitespace-nowrap"
          >
            <span className={soKySuggesting ? "animate-spin inline-block" : ""}>
              {soKySuggesting ? "⟳" : "✨"}
            </span>
            Số/KH
          </button>

          {/* Căn cứ */}
          <button
            type="button"
            onClick={() => setCanCuPanelOpen(true)}
            title="Gợi ý căn cứ pháp lý từ kho văn bản"
            className="flex items-center gap-1 px-2 py-1 text-xs rounded text-purple-600 hover:bg-purple-50 transition-colors whitespace-nowrap"
          >
            ✨ Căn cứ
          </button>
        </div>
      </div>

      {/* ── Banner AI điền thông minh (chỉ hiện khi tạo mới) ─── */}
      {isNew && (
        <div className="flex items-center gap-2 px-4 py-2 bg-purple-50 border-b border-purple-100 text-sm text-purple-700 print:hidden">
          <span>✨</span>
          <span>Văn bản mới — dùng AI để điền nhanh:</span>
          <button
            type="button"
            onClick={handleAIFillAll}
            className="font-medium underline hover:text-purple-900 transition-colors"
          >
            Điền thông minh
          </button>
        </div>
      )}

      {/* ── Shared TipTap toolbar (shown when a rich-text field is focused) ── */}
      <div className={`shrink-0 border-b bg-white print:hidden transition-all duration-150 ${
        activeEditor ? "opacity-100" : "opacity-0 pointer-events-none h-0 overflow-hidden"
      }`}>
        <EditorToolbar editor={activeEditor} />
      </div>

      {/* ── A4 scroll wrapper ─────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto bg-[#e5e7eb] py-6 print:bg-white print:p-0 print:overflow-visible">
        <div
          className="a4-page mx-auto bg-white shadow-lg print:shadow-none"
          style={{
            width: "210mm", minHeight: "297mm",
            ...getPageMargins(),
            fontFamily: "'Times New Roman', Times, serif",
            fontSize: "14pt", color: "#000", boxSizing: "border-box",
          }}
        >

          {/* ══ VÙNG A — THỂ THỨC ══════════════════════════════════════ */}

          {/* Header 2 cột: trái 45%, phải 55% */}
          <div style={{ display: "grid", gridTemplateColumns: "45% 55%", gap: "4mm", marginBottom: "6mm" }}>

            {/* Cột trái: Ô 2 + Ô 3 */}
            <div>
              <Nd30Field
                value={data.coQuanChuQuan}
                onChange={(v) => update("coQuanChuQuan", v)}
                style={getFontStyle("co_quan_chu_quan")}
                placeholder="TÊN CƠ QUAN CHỦ QUẢN"
              />
              <Nd30Field
                value={data.coQuanBanHanh}
                onChange={(v) => update("coQuanBanHanh", v)}
                style={getFontStyle("co_quan_ban_hanh")}
                placeholder="TÊN CƠ QUAN BAN HÀNH"
              />
              <div style={{ height: "1.5px", background: "#000", width: "50%", margin: "2px auto 4px" }} />
              {/* Số/KH — inline để không có khoảng cách thừa */}
              <div style={{ textAlign: "center" }}>
                <span style={getFontStyle("so_ky_hieu")}>Số: </span>
                <Nd30Field
                  value={data.soKyHieu}
                  onChange={(v) => update("soKyHieu", v)}
                  style={{ ...getFontStyle("so_ky_hieu"), display: "inline", fontStyle: "italic" }}
                  placeholder={soKHHint}
                />
              </div>

              {/* Ô 10a: Độ mật — chỉ hiện khi khác Thường */}
              {showDoMat && (
                <div style={{ textAlign: "center", marginTop: "3mm" }}>
                  <span style={{
                    display: "inline-block",
                    border: "1px solid #000",
                    padding: "2px 8px",
                    fontFamily: "'Times New Roman', serif",
                    fontSize: "13pt",
                    fontWeight: "bold",
                    textTransform: "uppercase",
                  }}>
                    {data.doMat}
                  </span>
                </div>
              )}

              {/* Ô 10b: Độ khẩn — chỉ hiện khi khác Thường */}
              {showDoKhan && (
                <div style={{ textAlign: "center", marginTop: "2mm" }}>
                  <span style={{
                    display: "inline-block",
                    border: "1px solid #000",
                    padding: "2px 8px",
                    fontFamily: "'Times New Roman', serif",
                    fontSize: "13pt",
                    fontWeight: "bold",
                    textTransform: "uppercase",
                  }}>
                    {data.doKhan}
                  </span>
                </div>
              )}
            </div>

            {/* Cột phải: Ô 1 + Ô 4 */}
            <div>
              <div
                ref={quocHieuRef}
                style={{ ...getFontStyle("quoc_huy"), fontSize: "12pt", letterSpacing: "0.5px", whiteSpace: "nowrap", overflow: "visible" }}
              >
                {QUOC_HUY}
              </div>

              <div style={{ textAlign: "center", marginBottom: "4mm" }}>
                <span style={{ ...getFontStyle("tieu_ngu"), display: "inline-block", borderBottom: "1.5px solid #000", paddingBottom: "2px", whiteSpace: "nowrap" }}>
                  {TIEU_NGU}
                </span>
              </div>

              {/* Địa danh + ngày tháng — 1 dòng, nowrap */}
              <div style={{ display: "flex", justifyContent: "center", alignItems: "baseline", gap: 0, whiteSpace: "nowrap" }}>
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

          {/* ── Ô 5a: Tên loại VB + trích yếu ──────────────────────── */}
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
              <div style={{ height: "1.5px", background: "#000", width: "40%", margin: "3px auto 0" }} />
            </div>
          )}

          {/* ── Ô 5b: Trích yếu công văn ────────────────────────────── */}
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

          {/* ── Ô 9a: Kính gửi ──────────────────────────────────────── */}
          {showKinhGui && (
            <div style={{ marginBottom: "3mm", marginTop: "2mm", display: "flex", gap: "4px", alignItems: "flex-start" }}>
              <span style={{ fontFamily: "'Times New Roman',serif", fontSize: "14pt", whiteSpace: "nowrap" }}>
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

          {/* ══ VÙNG B — CĂN CỨ ════════════════════════════════════════ */}
          <div style={{ marginBottom: "3mm" }}>
            <SectionEditor
              content={data.canCu}
              onChange={(v) => update("canCu", v)}
              placeholder="Căn cứ [tên văn bản] số [số/KH] ngày ... tháng ... năm ... của [cơ quan] về ...;"
              minHeight="60px"
              italic
              isActive={activeFieldId === "canCu"}
              onEditorFocused={(ed) => handleEditorFocused("canCu", ed)}
            />
          </div>

          {/* ══ VÙNG C — NỘI DUNG ══════════════════════════════════════ */}
          <div style={{ marginBottom: "6mm" }}>
            <SectionEditor
              content={data.noiDung}
              onChange={(v) => update("noiDung", v)}
              placeholder="Nội dung chính của văn bản..."
              minHeight="200px"
              isActive={activeFieldId === "noiDung"}
              onEditorFocused={(ed) => handleEditorFocused("noiDung", ed)}
            />
          </div>

          {/* ══ PHẦN KÝ ════════════════════════════════════════════════ */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", marginTop: "4mm" }}>

            {/* Cột trái: Nơi nhận */}
            <div style={{ paddingRight: "4mm" }}>
              <div style={getFontStyle("noi_nhan_label")}>Nơi nhận:</div>
              <RecipientTagInput
                value={data.noiNhan}
                onChange={(v) => update("noiNhan", v)}
                style={getFontStyle("noi_nhan_list")}
                placeholder="- Như trên; (Enter để thêm)"
              />
            </div>

            {/* Cột phải: Ký */}
            <div style={{ textAlign: "center", paddingLeft: "4mm" }}>
              <div style={{ display: "flex", justifyContent: "center", alignItems: "baseline", gap: "4px", marginBottom: "2px" }}>
                <div className="print:hidden" style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
                  <select
                    value={data.quyenHanKy}
                    onChange={(e) => update("quyenHanKy", e.target.value)}
                    className="appearance-none"
                    style={{ fontFamily: "'Times New Roman',serif", fontSize: "14pt", fontWeight: "bold", color: "#000", background: "transparent", border: "none", outline: "none", cursor: "pointer", paddingRight: "14px" }}
                  >
                    {Object.values(QUYEN_HAN_KY).map((v) => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none text-muted-foreground" style={{ position: "absolute", right: 0, top: "50%", transform: "translateY(-50%)", width: "12px", height: "12px" }} />
                </div>
                <span className="hidden print:inline" style={getFontStyle("quyen_han_ky")}>{data.quyenHanKy}</span>
                <Nd30Field
                  value={data.chucDanhTapThe}
                  onChange={(v) => update("chucDanhTapThe", v)}
                  style={getFontStyle("quyen_han_ky")}
                  placeholder="TÊN TẬP THỂ LÃNH ĐẠO"
                />
              </div>

              <Nd30Field
                value={data.chucVuKy}
                onChange={(v) => update("chucVuKy", v)}
                style={getFontStyle("chuc_vu_ky")}
                placeholder="CHỨC VỤ NGƯỜI KÝ"
              />

              <div style={{ height: "18mm" }} />

              <Nd30Field
                value={data.hoTenKy}
                onChange={(v) => update("hoTenKy", v)}
                style={getFontStyle("ho_ten_ky")}
                placeholder="Họ và tên người ký"
              />
            </div>
          </div>

        </div>
      </div>

      <TrichYeuSuggestPanel
        isOpen={trichYeuPanelOpen}
        onClose={() => setTrichYeuPanelOpen(false)}
        loaiVb={getLoaiVbDisplay(data.loaiVanBan)}
        loaiVbRaw={data.loaiVanBan || ""}
        currentTrichYeu={data.trichYeu || ""}
        onSelect={(val) => update("trichYeu", val)}
      />
      <CanCuSuggestPanel
        isOpen={canCuPanelOpen}
        onClose={() => setCanCuPanelOpen(false)}
        loaiVb={getLoaiVbDisplay(data.loaiVanBan)}
        trichYeu={data.trichYeu || ""}
        onApply={handleApplyCanCu}
      />
    </div>
  );
}
