"""
Nghị định 30/2020/NĐ-CP ngày 05/3/2020 của Chính phủ
về công tác văn thư — Các hằng số thể thức văn bản

Nguồn: Phụ lục I, III, VI kèm theo Nghị định 30/2020/NĐ-CP
"""

from dataclasses import dataclass, field
from typing import Literal


# ============================================================
# 1. FONT VÀ CỠ CHỮ (Phụ lục I, Mục V)
# ============================================================

@dataclass(frozen=True)
class FontStyle:
    """Quy cách font chữ cho từng thành phần thể thức."""
    size_min: int          # cỡ chữ tối thiểu (pt)
    size_max: int          # cỡ chữ tối đa (pt)
    bold: bool             # đậm
    italic: bool           # nghiêng
    underline: bool        # gạch chân
    uppercase: bool        # in hoa
    align: str             # căn lề: left | center | right | justify


# Quốc hiệu: "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM"
FONT_QUOC_HUY = FontStyle(
    size_min=12, size_max=13,
    bold=True, italic=False, underline=False,
    uppercase=True, align="center",
)

# Tiêu ngữ: "Độc lập - Tự do - Hạnh phúc"
FONT_TIEU_NGU = FontStyle(
    size_min=13, size_max=14,
    bold=True, italic=False, underline=True,
    uppercase=False, align="center",
)

# Tên cơ quan chủ quản (cơ quan cấp trên trực tiếp)
FONT_CO_QUAN_CHU_QUAN = FontStyle(
    size_min=12, size_max=13,
    bold=False, italic=False, underline=False,
    uppercase=True, align="center",
)

# Tên cơ quan ban hành văn bản
FONT_CO_QUAN_BAN_HANH = FontStyle(
    size_min=12, size_max=13,
    bold=True, italic=False, underline=False,
    uppercase=True, align="center",
)

# Số và ký hiệu văn bản
FONT_SO_KY_HIEU = FontStyle(
    size_min=13, size_max=13,
    bold=False, italic=False, underline=False,
    uppercase=False, align="left",
)

# Địa danh và ngày tháng năm ban hành
FONT_DIA_DANH_NGAY = FontStyle(
    size_min=13, size_max=14,
    bold=False, italic=True, underline=False,
    uppercase=False, align="right",
)

# Tên loại văn bản (QĐ, NQ, CT, ...)
FONT_TEN_LOAI_VB = FontStyle(
    size_min=13, size_max=14,
    bold=True, italic=False, underline=False,
    uppercase=True, align="center",
)

# Trích yếu nội dung — văn bản có tên loại (dưới tên loại)
FONT_TRICH_YEU_CO_TEN_LOAI = FontStyle(
    size_min=13, size_max=14,
    bold=True, italic=False, underline=False,
    uppercase=False, align="center",
)

# Trích yếu nội dung — công văn (dưới số/KH)
FONT_TRICH_YEU_CONG_VAN = FontStyle(
    size_min=12, size_max=13,
    bold=False, italic=False, underline=False,
    uppercase=False, align="center",
)

# Nội dung chính văn bản
FONT_NOI_DUNG = FontStyle(
    size_min=13, size_max=14,
    bold=False, italic=False, underline=False,
    uppercase=False, align="justify",
)

# Quyền hạn người ký (TM. / KT. / TL. / TUQ.)
FONT_QUYEN_HAN_KY = FontStyle(
    size_min=13, size_max=14,
    bold=True, italic=False, underline=False,
    uppercase=True, align="center",
)

# Chức vụ người ký
FONT_CHUC_VU_KY = FontStyle(
    size_min=13, size_max=14,
    bold=True, italic=False, underline=False,
    uppercase=True, align="center",
)

# Họ và tên người ký
FONT_HO_TEN_KY = FontStyle(
    size_min=13, size_max=14,
    bold=True, italic=False, underline=False,
    uppercase=False, align="center",
)

# "Nơi nhận:" (nhãn)
FONT_NOI_NHAN_LABEL = FontStyle(
    size_min=12, size_max=12,
    bold=True, italic=True, underline=False,
    uppercase=False, align="left",
)

# Danh sách nơi nhận
FONT_NOI_NHAN_LIST = FontStyle(
    size_min=11, size_max=11,
    bold=False, italic=False, underline=False,
    uppercase=False, align="left",
)

# Bảng tổng hợp tất cả font styles
FONT_STYLES: dict[str, FontStyle] = {
    "quoc_huy":              FONT_QUOC_HUY,
    "tieu_ngu":              FONT_TIEU_NGU,
    "co_quan_chu_quan":      FONT_CO_QUAN_CHU_QUAN,
    "co_quan_ban_hanh":      FONT_CO_QUAN_BAN_HANH,
    "so_ky_hieu":            FONT_SO_KY_HIEU,
    "dia_danh_ngay":         FONT_DIA_DANH_NGAY,
    "ten_loai_vb":           FONT_TEN_LOAI_VB,
    "trich_yeu_co_ten_loai": FONT_TRICH_YEU_CO_TEN_LOAI,
    "trich_yeu_cong_van":    FONT_TRICH_YEU_CONG_VAN,
    "noi_dung":              FONT_NOI_DUNG,
    "quyen_han_ky":          FONT_QUYEN_HAN_KY,
    "chuc_vu_ky":            FONT_CHUC_VU_KY,
    "ho_ten_ky":             FONT_HO_TEN_KY,
    "noi_nhan_label":        FONT_NOI_NHAN_LABEL,
    "noi_nhan_list":         FONT_NOI_NHAN_LIST,
}


# ============================================================
# 2. LỀ TRANG (Phụ lục I, Mục I)
# ============================================================

@dataclass(frozen=True)
class PageMargin:
    """Lề trang tính bằng mm."""
    top_min: int
    top_max: int
    bottom_min: int
    bottom_max: int
    left_min: int
    left_max: int
    right_min: int
    right_max: int


# Khổ giấy A4 (mm)
PAGE_WIDTH_MM  = 210
PAGE_HEIGHT_MM = 297

PAGE_MARGIN = PageMargin(
    top_min=20,    top_max=25,
    bottom_min=20, bottom_max=25,
    left_min=30,   left_max=35,
    right_min=15,  right_max=20,
)

# Giá trị khuyến nghị thường dùng (mm)
PAGE_MARGIN_DEFAULT = {
    "top":    25,
    "bottom": 25,
    "left":   30,
    "right":  20,
}

# Lùi đầu dòng nội dung (cm)
INDENT_FIRST_LINE_CM = 1.0


# ============================================================
# 3. VỊ TRÍ CÁC Ô THÀNH PHẦN (Phụ lục I, Mục IV — Sơ đồ)
# ============================================================

@dataclass(frozen=True)
class FieldPosition:
    """Vị trí và căn lề của từng ô thành phần thể thức."""
    zone: Literal["top-left", "top-right", "center", "bottom-left", "bottom-right"]
    align: str        # căn lề nội dung bên trong ô
    description: str  # mô tả ngắn


# Ô 1: Quốc hiệu + Tiêu ngữ — góc PHẢI trên
POSITION_O1_QUOC_HUY = FieldPosition(
    zone="top-right",
    align="center",
    description="Quốc hiệu CHXHCNVN + Tiêu ngữ Độc lập - Tự do - Hạnh phúc",
)

# Ô 2: Tên cơ quan ban hành — góc TRÁI trên
POSITION_O2_CO_QUAN = FieldPosition(
    zone="top-left",
    align="center",
    description="Tên CQ chủ quản (trên) và tên CQ ban hành (dưới, đậm hơn)",
)

# Ô 3: Số và ký hiệu — dưới tên CQ, căn trái
POSITION_O3_SO_KH = FieldPosition(
    zone="top-left",
    align="left",
    description="Số: .../năm/loại-cơquan — nằm dưới tên CQ ban hành",
)

# Ô 4: Địa danh, ngày tháng năm — cùng dòng với Ô 3, căn phải
POSITION_O4_DIA_DANH = FieldPosition(
    zone="top-right",
    align="right",
    description="Địa danh, ngày ... tháng ... năm ... — cùng hàng với số/KH",
)

# Ô 5a: Tên loại + trích yếu — căn GIỮA trang (VB có tên loại)
POSITION_O5A_TEN_LOAI = FieldPosition(
    zone="center",
    align="center",
    description="Tên loại VB (in hoa đậm) + trích yếu (thường đậm) — căn giữa",
)

# Ô 5b: Trích yếu công văn — căn giữa, dưới số/KH (chỉ dùng cho công văn)
POSITION_O5B_TRICH_YEU_CV = FieldPosition(
    zone="center",
    align="center",
    description="V/v ... — trích yếu công văn, không có tên loại phía trên",
)

# Ô 6: Nội dung văn bản — căn đều 2 lề, lùi đầu dòng 1 cm
POSITION_O6_NOI_DUNG = FieldPosition(
    zone="center",
    align="justify",
    description="Phần nội dung chính, căn đều, thụt đầu dòng 1 cm",
)

# Ô 7a: Quyền hạn người ký — góc PHẢI dưới
POSITION_O7A_QUYEN_HAN = FieldPosition(
    zone="bottom-right",
    align="center",
    description="TM. / KT. / TL. / TUQ. + chức danh tập thể lãnh đạo",
)

# Ô 7b: Họ và tên người ký — dưới chữ ký, căn giữa cột phải
POSITION_O7B_HO_TEN = FieldPosition(
    zone="bottom-right",
    align="center",
    description="Họ và tên người ký (in thường đậm), nằm dưới khoảng chữ ký",
)

# Ô 7c: Khoảng chữ ký tay — giữa ô 7a và 7b (khoảng 3 dòng trắng)
POSITION_O7C_CHU_KY = FieldPosition(
    zone="bottom-right",
    align="center",
    description="Khoảng trống ký tay (khoảng 3–4 dòng) giữa chức vụ và họ tên",
)

# Ô 8: Dấu và chữ ký số — trùm lên 1/3 bên trái chữ ký
POSITION_O8_DAU = FieldPosition(
    zone="bottom-right",
    align="left",
    description="Con dấu/chữ ký số phủ 1/3 lên chữ ký tay về phía trái",
)

# Ô 9a: Kính gửi — căn trái, ngay dưới phần tên loại/trích yếu
POSITION_O9A_KINH_GUI = FieldPosition(
    zone="center",
    align="left",
    description="Kính gửi: ... (công văn, tờ trình, báo cáo gửi cấp trên)",
)

# Ô 9b: Nơi nhận — góc TRÁI dưới, label 12pt nghiêng đậm
POSITION_O9B_NOI_NHAN = FieldPosition(
    zone="bottom-left",
    align="left",
    description="Nơi nhận: (label) + danh sách đơn vị nhận (11pt đứng)",
)

# Ô 12: Ký hiệu người đánh máy/soạn thảo — dưới nơi nhận
POSITION_O12_KY_HIEU_SOAN = FieldPosition(
    zone="bottom-left",
    align="left",
    description="Ký hiệu người soạn thảo (VD: NVA/15), dưới danh sách nơi nhận",
)

# Bảng tổng hợp tất cả vị trí ô
FIELD_POSITIONS: dict[str, FieldPosition] = {
    "o1_quoc_huy":       POSITION_O1_QUOC_HUY,
    "o2_co_quan":        POSITION_O2_CO_QUAN,
    "o3_so_kh":          POSITION_O3_SO_KH,
    "o4_dia_danh":       POSITION_O4_DIA_DANH,
    "o5a_ten_loai":      POSITION_O5A_TEN_LOAI,
    "o5b_trich_yeu_cv":  POSITION_O5B_TRICH_YEU_CV,
    "o6_noi_dung":       POSITION_O6_NOI_DUNG,
    "o7a_quyen_han":     POSITION_O7A_QUYEN_HAN,
    "o7b_ho_ten":        POSITION_O7B_HO_TEN,
    "o7c_chu_ky":        POSITION_O7C_CHU_KY,
    "o8_dau":            POSITION_O8_DAU,
    "o9a_kinh_gui":      POSITION_O9A_KINH_GUI,
    "o9b_noi_nhan":      POSITION_O9B_NOI_NHAN,
    "o12_ky_hieu_soan":  POSITION_O12_KY_HIEU_SOAN,
}


# ============================================================
# 4. CHỮ VIẾT TẮT LOẠI VĂN BẢN (Phụ lục III — NĐ 30/2020)
# ============================================================

@dataclass(frozen=True)
class VanBanType:
    """Thông tin một loại văn bản hành chính."""
    abbreviation: str   # chữ viết tắt
    full_name: str      # tên đầy đủ tiếng Việt
    has_type_name: bool # True = có tên loại in trên VB; False = không (công văn)


VAN_BAN_TYPES: dict[str, VanBanType] = {
    # --- Văn bản quy phạm pháp luật ---
    "NQ":  VanBanType("NQ",  "Nghị quyết",                         True),
    "QĐ":  VanBanType("QĐ",  "Quyết định",                         True),
    "CT":  VanBanType("CT",  "Chỉ thị",                            True),
    "QC":  VanBanType("QC",  "Quy chế",                            True),
    "QyĐ": VanBanType("QyĐ", "Quy định",                           True),

    # --- Văn bản hành chính thông thường ---
    "TC":  VanBanType("TC",  "Thông cáo",                          True),
    "TB":  VanBanType("TB",  "Thông báo",                          True),
    "HD":  VanBanType("HD",  "Hướng dẫn",                          True),
    "CTr": VanBanType("CTr", "Chương trình",                       True),
    "KH":  VanBanType("KH",  "Kế hoạch",                           True),
    "PA":  VanBanType("PA",  "Phương án",                          True),
    "ĐA":  VanBanType("ĐA",  "Đề án",                              True),
    "DA":  VanBanType("DA",  "Dự án",                              True),
    "BC":  VanBanType("BC",  "Báo cáo",                            True),
    "BB":  VanBanType("BB",  "Biên bản",                           True),
    "TTr": VanBanType("TTr", "Tờ trình",                           True),
    "HĐ":  VanBanType("HĐ",  "Hợp đồng",                          True),
    "CĐ":  VanBanType("CĐ",  "Công điện",                          True),

    # --- Giấy tờ hành chính (không có tên loại in riêng) ---
    "BGN": VanBanType("BGN", "Bản ghi nhớ",                        False),
    "BTT": VanBanType("BTT", "Bản thỏa thuận",                     False),
    "GUQ": VanBanType("GUQ", "Giấy ủy quyền",                      False),
    "GM":  VanBanType("GM",  "Giấy mời",                           False),
    "GGT": VanBanType("GGT", "Giấy giới thiệu",                    False),
    "GNP": VanBanType("GNP", "Giấy nghỉ phép",                     False),
    "PG":  VanBanType("PG",  "Phiếu gửi",                         False),
    "PC":  VanBanType("PC",  "Phiếu chuyển",                       False),
    "PB":  VanBanType("PB",  "Phiếu báo",                          False),

    # --- Công văn (không có tên loại, dùng "V/v") ---
    "CV":  VanBanType("CV",  "Công văn",                           False),
}

# Tập hợp viết tắt công văn (không có tên loại riêng)
CONG_VAN_ABBREVS: frozenset[str] = frozenset({"CV", "BGN", "BTT", "GUQ", "GM", "GGT", "GNP", "PG", "PC", "PB"})

# Tập hợp viết tắt văn bản có tên loại
CO_TEN_LOAI_ABBREVS: frozenset[str] = frozenset(
    k for k, v in VAN_BAN_TYPES.items() if v.has_type_name
)


# ============================================================
# 5. FORMAT SỐ VÀ KÝ HIỆU VĂN BẢN (Điều 9, NĐ 30/2020)
# ============================================================

# Mẫu số/ký hiệu cho từng nhóm (dùng với str.format hoặc f-string)
# Các placeholder: {so} = số thứ tự, {nam} = năm, {loai} = loại VB, {cq} = viết tắt CQ

# VB có tên loại: số/năm/loại-cơquan — VD: 15/2025/QĐ-UBND
SO_KH_FORMAT_CO_TEN_LOAI = "{so}/{nam}/{loai}-{cq}"
SO_KH_EXAMPLE_CO_TEN_LOAI = "15/2025/QĐ-UBND"

# Công văn (dạng đầy đủ): số/năm/CV-cơquan — VD: 125/2025/CV-SNV
SO_KH_FORMAT_CONG_VAN_DAY_DU = "{so}/{nam}/CV-{cq}"
SO_KH_EXAMPLE_CONG_VAN_1 = "125/2025/CV-SNV"

# Công văn (dạng rút gọn): số/cơquan-phòng — VD: 05/SNV-VP
SO_KH_FORMAT_CONG_VAN_RUT_GON = "{so}/{cq}-{phong}"
SO_KH_EXAMPLE_CONG_VAN_2 = "05/SNV-VP"

# Nghị quyết: số/năm/NQ-cơquan — VD: 12/2025/NQ-HĐND
SO_KH_FORMAT_NGHI_QUYET = "{so}/{nam}/NQ-{cq}"
SO_KH_EXAMPLE_NGHI_QUYET = "12/2025/NQ-HĐND"

# Tất cả format theo loại VB
SO_KH_FORMATS: dict[str, str] = {
    "co_ten_loai":      SO_KH_FORMAT_CO_TEN_LOAI,
    "cong_van_day_du":  SO_KH_FORMAT_CONG_VAN_DAY_DU,
    "cong_van_rut_gon": SO_KH_FORMAT_CONG_VAN_RUT_GON,
    "nghi_quyet":       SO_KH_FORMAT_NGHI_QUYET,
}


# ============================================================
# 6. CĂN CỨ PHÁP LÝ — Format chuẩn (Điều 14, NĐ 30/2020)
# ============================================================

# Template một dòng căn cứ (kết thúc bằng dấu ; trừ dòng cuối cùng dùng dấu ,)
CAN_CU_TEMPLATE = (
    "Căn cứ {ten_loai_vb} số {so_ky_hieu} ngày {ngay:02d} tháng {thang:02d} "
    "năm {nam} của {co_quan} về {trich_yeu};"
)

# Dòng căn cứ cuối cùng kết thúc bằng dấu phẩy trước "Theo đề nghị..."
CAN_CU_LAST_LINE_SUFFIX = ","

# Dòng "Theo đề nghị của..." thường đứng sau căn cứ
THEO_DE_NGHI_TEMPLATE = "Theo đề nghị của {chuc_danh} {don_vi},"

# Ví dụ căn cứ hoàn chỉnh
CAN_CU_EXAMPLE = (
    "Căn cứ Luật Tổ chức chính quyền địa phương ngày 19 tháng 6 năm 2015;\n"
    "Căn cứ Luật sửa đổi, bổ sung một số điều của Luật Tổ chức Chính phủ và "
    "Luật Tổ chức chính quyền địa phương ngày 22 tháng 11 năm 2019;\n"
    "Căn cứ Nghị định số 30/2020/NĐ-CP ngày 05 tháng 3 năm 2020 của Chính phủ "
    "về công tác văn thư;\n"
    "Theo đề nghị của Giám đốc Sở Nội vụ,"
)


# ============================================================
# 7. CÁC MẪU VĂN BẢN (Phụ lục III — NĐ 30/2020)
# ============================================================

@dataclass(frozen=True)
class VanBanTemplate:
    """Thông tin mẫu văn bản theo Phụ lục III."""
    code: str               # mã mẫu
    name: str               # tên mẫu
    type_abbrev: str        # loại VB viết tắt
    has_type_name: bool     # có tên loại in trên VB
    sections: list[str]     # các ô thể thức có trong mẫu
    notes: str              # ghi chú thêm


VAN_BAN_TEMPLATES: dict[str, VanBanTemplate] = {
    "1.1": VanBanTemplate(
        code="1.1",
        name="Nghị quyết (cá biệt)",
        type_abbrev="NQ",
        has_type_name=True,
        sections=["o1", "o2", "o3", "o4", "o5a", "o6", "o7a", "o7b", "o7c", "o8", "o9b"],
        notes="Dùng cho nghị quyết của HĐND, cơ quan tập thể",
    ),
    "1.2": VanBanTemplate(
        code="1.2",
        name="Quyết định (quy phạm/cá biệt) — ban hành trực tiếp",
        type_abbrev="QĐ",
        has_type_name=True,
        sections=["o1", "o2", "o3", "o4", "o5a", "o6", "o7a", "o7b", "o7c", "o8", "o9b"],
        notes="Phần căn cứ và điều khoản nằm trong ô 6",
    ),
    "1.3": VanBanTemplate(
        code="1.3",
        name="Quyết định — ban hành kèm văn bản khác (gián tiếp)",
        type_abbrev="QĐ",
        has_type_name=True,
        sections=["o1", "o2", "o3", "o4", "o5a", "o6", "o7a", "o7b", "o7c", "o8", "o9b"],
        notes="Có thêm phụ lục kèm theo; phần nội dung nêu ban hành kèm VB nào",
    ),
    "1.4": VanBanTemplate(
        code="1.4",
        name="Văn bản có tên loại khác (TB, BC, KH, HD, ...)",
        type_abbrev="TB",  # đại diện
        has_type_name=True,
        sections=["o1", "o2", "o3", "o4", "o5a", "o6", "o7a", "o7b", "o7c", "o8", "o9a", "o9b"],
        notes="Áp dụng cho mọi VB có tên loại trừ QĐ, NQ",
    ),
    "1.5": VanBanTemplate(
        code="1.5",
        name="Công văn",
        type_abbrev="CV",
        has_type_name=False,
        sections=["o1", "o2", "o3", "o4", "o5b", "o6", "o7a", "o7b", "o7c", "o8", "o9a", "o9b", "o12"],
        notes="Không có tên loại; dùng 'V/v' thay trích yếu; bắt buộc có kính gửi",
    ),
    "1.6": VanBanTemplate(
        code="1.6",
        name="Công điện",
        type_abbrev="CĐ",
        has_type_name=True,
        sections=["o1", "o2", "o3", "o4", "o5a", "o6", "o7a", "o7b", "o7c", "o8", "o9b"],
        notes="Truyền qua mạng viễn thông, có thể không đóng dấu đỏ",
    ),
    "1.7": VanBanTemplate(
        code="1.7",
        name="Giấy mời",
        type_abbrev="GM",
        has_type_name=False,
        sections=["o1", "o2", "o3", "o4", "o6", "o7a", "o7b", "o7c", "o8"],
        notes="Ghi rõ thời gian, địa điểm, thành phần",
    ),
    "1.8": VanBanTemplate(
        code="1.8",
        name="Giấy giới thiệu",
        type_abbrev="GGT",
        has_type_name=False,
        sections=["o1", "o2", "o3", "o4", "o6", "o7a", "o7b", "o7c", "o8"],
        notes="Ghi rõ họ tên, chức vụ, nhiệm vụ được giao",
    ),
    "1.9": VanBanTemplate(
        code="1.9",
        name="Biên bản",
        type_abbrev="BB",
        has_type_name=True,
        sections=["o1", "o2", "o5a", "o6", "o7b", "o7c"],
        notes="Không nhất thiết có số/KH; cần đủ thành phần tham dự, nội dung, ký xác nhận",
    ),
    "1.10": VanBanTemplate(
        code="1.10",
        name="Giấy nghỉ phép",
        type_abbrev="GNP",
        has_type_name=False,
        sections=["o1", "o2", "o3", "o4", "o6", "o7a", "o7b", "o7c", "o8"],
        notes="Do thủ trưởng cơ quan ký duyệt",
    ),
}


# ============================================================
# 8. METADATA VĂN BẢN (Phụ lục VI — Chuẩn thông tin đầu vào)
# ============================================================

@dataclass(frozen=True)
class MetadataField:
    """Định nghĩa một trường metadata văn bản."""
    key: str            # tên trường (tiếng Anh, dùng trong DB/API)
    label_vi: str       # nhãn hiển thị tiếng Việt
    required: bool      # bắt buộc
    dtype: str          # kiểu dữ liệu: str | int | date | bool | list
    description: str    # mô tả thêm


# --- Trường dùng chung cho cả văn bản đi và đến ---
METADATA_COMMON: list[MetadataField] = [
    MetadataField("FileCode",      "Mã hồ sơ / lưu trữ",        False, "str",  "Mã phân loại hồ sơ theo danh mục"),
    MetadataField("TypeName",      "Loại văn bản",               True,  "str",  "Tên đầy đủ loại VB: Quyết định, Thông báo..."),
    MetadataField("CodeNumber",    "Số văn bản",                 True,  "str",  "Số thứ tự phát hành trong năm"),
    MetadataField("CodeNotation",  "Ký hiệu văn bản",            True,  "str",  "Viết tắt: QĐ-UBND, CV-SNV..."),
    MetadataField("IssuedDate",    "Ngày ban hành",              True,  "date", "Ngày ký ban hành chính thức"),
    MetadataField("OrganName",     "Cơ quan ban hành",           True,  "str",  "Tên đầy đủ cơ quan ký ban hành"),
    MetadataField("Subject",       "Trích yếu nội dung",         True,  "str",  "Tóm tắt nội dung chính (V/v...)"),
    MetadataField("PageAmount",    "Số trang",                   False, "int",  "Tổng số trang VB"),
]

# --- Thông tin người ký ---
METADATA_SIGNER: list[MetadataField] = [
    MetadataField("SignerPosition", "Chức vụ người ký",          True,  "str",  "Chức danh chính thức"),
    MetadataField("SignerFullName", "Họ và tên người ký",        True,  "str",  "Họ tên đầy đủ không viết tắt"),
]

# --- Trường bổ sung cho văn bản ĐI ---
METADATA_VB_DI: list[MetadataField] = [
    MetadataField("To",            "Nơi nhận",                   True,  "list", "Danh sách cơ quan/cá nhân nhận"),
    MetadataField("Priority",      "Mức độ khẩn",                False, "str",  "KHẨN / THƯỢNG KHẨN / HỎA TỐC / bình thường"),
    MetadataField("IssuedAmount",  "Số lượng phát hành",         False, "int",  "Tổng số bản phát hành"),
    MetadataField("SecurityLevel", "Mức độ mật",                 False, "str",  "MẬT / TỐI MẬT / TUYỆT MẬT / không mật"),
    MetadataField("DrafterId",     "Người soạn thảo",            False, "str",  "Họ tên hoặc ký hiệu người soạn"),
]

# --- Trường bổ sung cho văn bản ĐẾN ---
METADATA_VB_DEN: list[MetadataField] = [
    MetadataField("ArrivalDate",   "Ngày đến",                   True,  "date", "Ngày VB đến cơ quan nhận"),
    MetadataField("ArrivalNumber", "Số đến",                     True,  "str",  "Số vào sổ VB đến"),
    MetadataField("DueDate",       "Hạn xử lý",                  False, "date", "Thời hạn phải trả lời/xử lý"),
    MetadataField("Handler",       "Người/đơn vị xử lý",        False, "str",  "Phòng ban hoặc cá nhân được giao"),
    MetadataField("HandlingNote",  "Ý kiến chỉ đạo xử lý",      False, "str",  "Bút phê hoặc ghi chú của lãnh đạo"),
]

# Tổng hợp tất cả metadata
METADATA_ALL: dict[str, list[MetadataField]] = {
    "common": METADATA_COMMON,
    "signer": METADATA_SIGNER,
    "outgoing": METADATA_VB_DI,
    "incoming": METADATA_VB_DEN,
}

# Các giá trị hợp lệ cho trường Priority (mức độ khẩn)
PRIORITY_LEVELS: dict[str, str] = {
    "HOA_TOC":      "HỎA TỐC",
    "THUONG_KHAN":  "THƯỢNG KHẨN",
    "KHAN":         "KHẨN",
    "BINH_THUONG":  "",  # không đóng dấu
}

# Các giá trị hợp lệ cho trường SecurityLevel (mức độ mật)
SECURITY_LEVELS: dict[str, str] = {
    "TUYET_MAT":  "TUYỆT MẬT",
    "TOI_MAT":    "TỐI MẬT",
    "MAT":        "MẬT",
    "PHONG_BI":   "PHÒNG BÌ",
    "NONE":       "",  # không mật
}


# ============================================================
# 9. QUYỀN HẠN KÝ — Viết tắt theo NĐ 30/2020 (Điều 13)
# ============================================================

QUYEN_HAN_KY: dict[str, str] = {
    "TM":  "TM.",   # Thay mặt tập thể lãnh đạo
    "KT":  "KT.",   # Ký thay (cấp phó ký thay cấp trưởng)
    "TL":  "TL.",   # Thừa lệnh (theo lệnh của cấp trên)
    "TUQ": "TUQ.",  # Thừa ủy quyền
}


# ============================================================
# 10. CỐ ĐỊNH VĂN BẢN — Quốc hiệu & Tiêu ngữ
# ============================================================

QUOC_HUY = "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM"
TIEU_NGU = "Độc lập - Tự do - Hạnh phúc"
TIEU_NGU_SEPARATOR = " - "  # dấu phân cách trong tiêu ngữ (có khoảng trắng 2 bên)

# Đường kẻ ngang dưới tên CQ ban hành (độ dài chuẩn ~40% chiều ngang cột trái)
DUONG_KE_CO_QUAN = "─" * 20  # dùng ký tự Unicode box-drawing
