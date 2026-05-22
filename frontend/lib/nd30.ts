/**
 * Hằng số và helper functions theo NĐ 30/2020/NĐ-CP
 * Mirror từ backend/app/constants/nd30_2020.py
 * API: GET /api/v1/constants/nd30
 */

import type { CSSProperties } from "react";

// ── Types ──────────────────────────────────────────────────────────────────

export interface FontStyle {
  size_min: number;
  size_max: number;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  uppercase: boolean;
  align: "left" | "center" | "right" | "justify";
}

export interface VanBanType {
  abbreviation: string;
  full_name: string;
  has_type_name: boolean;
}

export interface VanBanTemplate {
  code: string;
  name: string;
  type_abbrev: string;
  has_type_name: boolean;
  sections: string[];
  notes: string;
}

export interface Nd30Data {
  // Header — Section A
  loaiVanBan: string;        // "QĐ" | "CV" | "NQ" | ...
  coQuanChuQuan: string;
  coQuanBanHanh: string;
  soKyHieu: string;
  diaDanh: string;
  ngayThang: string;
  trichYeu: string;
  kinhGui: string;
  doMat: string;             // "Thường" | "Mật" | "Tối mật" | "Tuyệt mật"
  doKhan: string;            // "Thường" | "Khẩn" | "Thượng khẩn" | "Hỏa tốc"
  // Section B — Căn cứ (TipTap HTML)
  canCu: string;
  // Section C — Nội dung (TipTap HTML)
  noiDung: string;
  // Ký
  quyenHanKy: string;        // "TM." | "KT." | "TL." | "TUQ."
  chucDanhTapThe: string;    // tên tập thể lãnh đạo (dòng dưới quyền hạn)
  chucVuKy: string;
  hoTenKy: string;
  noiNhan: string[];         // mỗi phần tử = 1 nơi nhận
}

export const DO_MAT_OPTIONS = ["Thường", "Mật", "Tối mật", "Tuyệt mật"] as const;
export const DO_KHAN_OPTIONS = ["Thường", "Khẩn", "Thượng khẩn", "Hỏa tốc"] as const;

// ── Static constants ───────────────────────────────────────────────────────

export const QUOC_HUY = "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM";
export const TIEU_NGU = "Độc lập - Tự do - Hạnh phúc";

export const DIA_DANH_LIST: string[] = [
  "Hà Nội", "TP. Hồ Chí Minh", "Đà Nẵng", "Hải Phòng", "Cần Thơ",
  "An Giang", "Bà Rịa - Vũng Tàu", "Bắc Giang", "Bắc Kạn", "Bạc Liêu",
  "Bắc Ninh", "Bến Tre", "Bình Định", "Bình Dương", "Bình Phước",
  "Bình Thuận", "Cà Mau", "Cao Bằng", "Đắk Lắk", "Đắk Nông",
  "Điện Biên", "Đồng Nai", "Đồng Tháp", "Gia Lai", "Hà Giang",
  "Hà Nam", "Hà Tĩnh", "Hải Dương", "Hậu Giang", "Hòa Bình",
  "Hưng Yên", "Khánh Hòa", "Kiên Giang", "Kon Tum", "Lai Châu",
  "Lâm Đồng", "Lạng Sơn", "Lào Cai", "Long An", "Nam Định",
  "Nghệ An", "Ninh Bình", "Ninh Thuận", "Phú Thọ", "Phú Yên",
  "Quảng Bình", "Quảng Nam", "Quảng Ngãi", "Quảng Ninh", "Quảng Trị",
  "Sóc Trăng", "Sơn La", "Tây Ninh", "Thái Bình", "Thái Nguyên",
  "Thanh Hóa", "Thừa Thiên Huế", "Tiền Giang", "Trà Vinh", "Tuyên Quang",
  "Vĩnh Long", "Vĩnh Phúc", "Yên Bái",
];

export const PAGE_WIDTH_MM  = 210;
export const PAGE_HEIGHT_MM = 297;
export const PAGE_MARGIN    = { top: 25, bottom: 25, left: 30, right: 20 };
export const INDENT_FIRST_LINE_CM = 1.0;

export const FONT_STYLES: Record<string, FontStyle> = {
  quoc_huy:              { size_min: 12, size_max: 13, bold: true,  italic: false, underline: false, uppercase: true,  align: "center"  },
  tieu_ngu:              { size_min: 13, size_max: 14, bold: true,  italic: false, underline: false, uppercase: false, align: "center"  },
  co_quan_chu_quan:      { size_min: 12, size_max: 13, bold: false, italic: false, underline: false, uppercase: true,  align: "center"  },
  co_quan_ban_hanh:      { size_min: 12, size_max: 13, bold: true,  italic: false, underline: false, uppercase: true,  align: "center"  },
  so_ky_hieu:            { size_min: 13, size_max: 13, bold: false, italic: false, underline: false, uppercase: false, align: "center"  },
  dia_danh_ngay:         { size_min: 13, size_max: 14, bold: false, italic: true,  underline: false, uppercase: false, align: "right"   },
  ten_loai_vb:           { size_min: 13, size_max: 14, bold: true,  italic: false, underline: false, uppercase: true,  align: "center"  },
  trich_yeu_co_ten_loai: { size_min: 13, size_max: 14, bold: true,  italic: false, underline: false, uppercase: false, align: "center"  },
  trich_yeu_cong_van:    { size_min: 12, size_max: 13, bold: false, italic: false, underline: false, uppercase: false, align: "center"  },
  noi_dung:              { size_min: 13, size_max: 14, bold: false, italic: false, underline: false, uppercase: false, align: "justify" },
  quyen_han_ky:          { size_min: 13, size_max: 14, bold: true,  italic: false, underline: false, uppercase: true,  align: "center"  },
  chuc_vu_ky:            { size_min: 13, size_max: 14, bold: true,  italic: false, underline: false, uppercase: true,  align: "center"  },
  ho_ten_ky:             { size_min: 13, size_max: 14, bold: true,  italic: false, underline: false, uppercase: false, align: "center"  },
  noi_nhan_label:        { size_min: 12, size_max: 12, bold: true,  italic: true,  underline: false, uppercase: false, align: "left"    },
  noi_nhan_list:         { size_min: 11, size_max: 11, bold: false, italic: false, underline: false, uppercase: false, align: "left"    },
};

export const VAN_BAN_TYPES: Record<string, VanBanType> = {
  NQ:  { abbreviation: "NQ",  full_name: "Nghị quyết",          has_type_name: true  },
  QĐ:  { abbreviation: "QĐ",  full_name: "Quyết định",          has_type_name: true  },
  CT:  { abbreviation: "CT",  full_name: "Chỉ thị",             has_type_name: true  },
  QC:  { abbreviation: "QC",  full_name: "Quy chế",             has_type_name: true  },
  TC:  { abbreviation: "TC",  full_name: "Thông cáo",           has_type_name: true  },
  TB:  { abbreviation: "TB",  full_name: "Thông báo",           has_type_name: true  },
  HD:  { abbreviation: "HD",  full_name: "Hướng dẫn",           has_type_name: true  },
  CTr: { abbreviation: "CTr", full_name: "Chương trình",        has_type_name: true  },
  KH:  { abbreviation: "KH",  full_name: "Kế hoạch",            has_type_name: true  },
  PA:  { abbreviation: "PA",  full_name: "Phương án",           has_type_name: true  },
  BC:  { abbreviation: "BC",  full_name: "Báo cáo",             has_type_name: true  },
  BB:  { abbreviation: "BB",  full_name: "Biên bản",            has_type_name: true  },
  TTr: { abbreviation: "TTr", full_name: "Tờ trình",            has_type_name: true  },
  CĐ:  { abbreviation: "CĐ",  full_name: "Công điện",           has_type_name: true  },
  CV:  { abbreviation: "CV",  full_name: "Công văn",            has_type_name: false },
  GM:  { abbreviation: "GM",  full_name: "Giấy mời",            has_type_name: false },
  GGT: { abbreviation: "GGT", full_name: "Giấy giới thiệu",     has_type_name: false },
  GNP: { abbreviation: "GNP", full_name: "Giấy nghỉ phép",      has_type_name: false },
};

export const VAN_BAN_TEMPLATES: Record<string, VanBanTemplate> = {
  "1.1":  { code: "1.1",  name: "Nghị quyết",                     type_abbrev: "NQ",  has_type_name: true,  sections: ["o1","o2","o3","o4","o5a","o6","o7a","o7b","o7c","o8","o9b"],             notes: "" },
  "1.2":  { code: "1.2",  name: "Quyết định (trực tiếp)",          type_abbrev: "QĐ",  has_type_name: true,  sections: ["o1","o2","o3","o4","o5a","o6","o7a","o7b","o7c","o8","o9b"],             notes: "" },
  "1.3":  { code: "1.3",  name: "Quyết định (ban hành kèm VB)",    type_abbrev: "QĐ",  has_type_name: true,  sections: ["o1","o2","o3","o4","o5a","o6","o7a","o7b","o7c","o8","o9b"],             notes: "Có phụ lục kèm theo" },
  "1.4":  { code: "1.4",  name: "Văn bản có tên loại khác",        type_abbrev: "TB",  has_type_name: true,  sections: ["o1","o2","o3","o4","o5a","o6","o7a","o7b","o7c","o8","o9b"],             notes: "" },
  "1.5":  { code: "1.5",  name: "Công văn",                        type_abbrev: "CV",  has_type_name: false, sections: ["o1","o2","o3","o4","o5b","o6","o7a","o7b","o7c","o8","o9a","o9b","o12"], notes: "Bắt buộc có kính gửi" },
  "1.6":  { code: "1.6",  name: "Công điện",                       type_abbrev: "CĐ",  has_type_name: true,  sections: ["o1","o2","o3","o4","o5a","o6","o7a","o7b","o7c","o8","o9b"],             notes: "" },
  "1.7":  { code: "1.7",  name: "Giấy mời",                        type_abbrev: "GM",  has_type_name: false, sections: ["o1","o2","o3","o4","o6","o7a","o7b","o7c","o8"],                         notes: "" },
  "1.8":  { code: "1.8",  name: "Giấy giới thiệu",                 type_abbrev: "GGT", has_type_name: false, sections: ["o1","o2","o3","o4","o9a","o6","o7a","o7b","o7c","o8"],                   notes: "" },
  "1.9":  { code: "1.9",  name: "Biên bản",                        type_abbrev: "BB",  has_type_name: true,  sections: ["o1","o2","o5a","o6","o7b","o7c"],                                        notes: "" },
  "1.10": { code: "1.10", name: "Giấy nghỉ phép",                  type_abbrev: "GNP", has_type_name: false, sections: ["o1","o2","o3","o4","o6","o7a","o7b","o7c","o8"],                         notes: "" },
};

export const QUYEN_HAN_KY: Record<string, string> = {
  TM:  "TM.",
  KT:  "KT.",
  TL:  "TL.",
  TUQ: "TUQ.",
};

// Loại VB → mã mẫu
const TYPE_TO_TEMPLATE: Record<string, string> = {
  NQ: "1.1", QĐ: "1.2", CV: "1.5", CĐ: "1.6",
  GM: "1.7", GGT: "1.8", BB: "1.9", GNP: "1.10",
};

// ── Helper functions ───────────────────────────────────────────────────────

/** Chuyển FontStyle → CSS properties (dùng pt units). */
export function getFontStyle(component: string): CSSProperties {
  const s = FONT_STYLES[component];
  if (!s) return {};
  return {
    fontFamily: "'Times New Roman', Times, serif",
    fontSize: `${s.size_max}pt`,
    fontWeight: s.bold ? "bold" : "normal",
    fontStyle: s.italic ? "italic" : "normal",
    textDecoration: s.underline ? "underline" : "none",
    textTransform: s.uppercase ? "uppercase" : "none",
    textAlign: s.align,
    lineHeight: 1.5,
  };
}

/** Lề trang dưới dạng CSS padding (mm). */
export function getPageMargins(): CSSProperties {
  const m = PAGE_MARGIN;
  return {
    paddingTop:    `${m.top}mm`,
    paddingBottom: `${m.bottom}mm`,
    paddingLeft:   `${m.left}mm`,
    paddingRight:  `${m.right}mm`,
  };
}

/** Trả về format string số/KH cho loại VB. */
export function getSoKHFormat(loai: string): string {
  const vb = VAN_BAN_TYPES[loai];
  if (!vb) return "{so}/{nam}/VB-{cq}";
  if (!vb.has_type_name) return "{so}/{nam}/CV-{cq}";
  if (loai === "NQ") return "{so}/{nam}/NQ-{cq}";
  return `{so}/{nam}/${loai}-{cq}`;
}

/** Sinh chuỗi số/ký hiệu hoàn chỉnh. */
export function generateSoKH(
  loai: string,
  so: number,
  nam: number,
  coQuan: string,
): string {
  const fmt = getSoKHFormat(loai);
  return fmt
    .replace("{so}", String(so))
    .replace("{nam}", String(nam))
    .replace("{loai}", loai)
    .replace("{cq}", coQuan);
}

/** Sinh một dòng căn cứ pháp lý chuẩn NĐ30. */
export function generateCanCu(
  tenVB: string,
  soKH: string,
  ngay: string,        // "DD/MM/YYYY"
  coQuan: string,
  trichYeu: string,
  isLast = false,
): string {
  const [dd, mm, yyyy] = ngay.split("/");
  const suffix = isLast ? "," : ";";
  return (
    `Căn cứ ${tenVB} số ${soKH} ngày ${dd} tháng ${mm} năm ${yyyy} ` +
    `của ${coQuan} về ${trichYeu}${suffix}`
  );
}

/** Lấy template schema theo mã mẫu (1.1 → 1.10). */
export function getVanBanTemplate(maMau: string): VanBanTemplate | undefined {
  return VAN_BAN_TEMPLATES[maMau];
}

/** Lấy template phù hợp nhất cho một loại VB. */
export function getTemplateForType(loai: string): VanBanTemplate {
  const code = TYPE_TO_TEMPLATE[loai] ?? "1.4";
  return VAN_BAN_TEMPLATES[code]!;
}

/** Template có hiển thị kính gửi không? */
export function hasKinhGui(template: VanBanTemplate): boolean {
  return template.sections.includes("o9a");
}

/** Template có tên loại VB (Ô 5a) không — hay chỉ trích yếu (Ô 5b)? */
export function hasTenLoai(template: VanBanTemplate): boolean {
  return template.sections.includes("o5a");
}

/** Giá trị mặc định cho document mới theo loại VB. */
export function defaultNd30Data(loai = "QĐ"): Nd30Data {
  return {
    loaiVanBan:     loai,
    coQuanChuQuan:  "",
    coQuanBanHanh:  "",
    soKyHieu:       "",
    diaDanh:        "TP. Hồ Chí Minh",
    ngayThang:      "",
    trichYeu:       "",
    kinhGui:        "",
    doMat:          "Thường",
    doKhan:         "Thường",
    canCu:          "",
    noiDung:        "",
    quyenHanKy:     "TM.",
    chucDanhTapThe: "",
    chucVuKy:       "",
    hoTenKy:        "",
    noiNhan:        ["- Như trên;", "- Lưu: VT."],
  };
}

/** Fetch live constants từ API (optional — dùng khi cần dữ liệu mới nhất). */
export async function fetchNd30Constants(baseUrl = "") {
  const res = await fetch(`${baseUrl}/api/v1/constants/nd30`);
  if (!res.ok) throw new Error("Failed to fetch nd30 constants");
  return res.json();
}
