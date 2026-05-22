from fastapi import APIRouter
from dataclasses import asdict
from app.constants.nd30_2020 import (
    FONT_STYLES, PAGE_MARGIN, PAGE_MARGIN_DEFAULT, INDENT_FIRST_LINE_CM,
    PAGE_WIDTH_MM, PAGE_HEIGHT_MM,
    FIELD_POSITIONS, VAN_BAN_TYPES, VAN_BAN_TEMPLATES,
    METADATA_ALL, SO_KH_FORMATS, QUYEN_HAN_KY,
    PRIORITY_LEVELS, SECURITY_LEVELS,
    QUOC_HUY, TIEU_NGU,
    CONG_VAN_ABBREVS, CO_TEN_LOAI_ABBREVS,
    CAN_CU_TEMPLATE,
)

router = APIRouter()


@router.get("/nd30")
async def get_nd30_constants():
    """Trả về toàn bộ hằng số thể thức theo NĐ 30/2020/NĐ-CP."""
    return {
        "font_styles": {k: asdict(v) for k, v in FONT_STYLES.items()},
        "page": {
            "width_mm": PAGE_WIDTH_MM,
            "height_mm": PAGE_HEIGHT_MM,
            "margin": asdict(PAGE_MARGIN),
            "margin_default": PAGE_MARGIN_DEFAULT,
            "indent_first_line_cm": INDENT_FIRST_LINE_CM,
        },
        "field_positions": {k: asdict(v) for k, v in FIELD_POSITIONS.items()},
        "van_ban_types": {k: asdict(v) for k, v in VAN_BAN_TYPES.items()},
        "van_ban_templates": {k: asdict(v) for k, v in VAN_BAN_TEMPLATES.items()},
        "metadata": {k: [asdict(f) for f in v] for k, v in METADATA_ALL.items()},
        "so_kh_formats": SO_KH_FORMATS,
        "quyen_han_ky": QUYEN_HAN_KY,
        "priority_levels": PRIORITY_LEVELS,
        "security_levels": SECURITY_LEVELS,
        "quoc_huy": QUOC_HUY,
        "tieu_ngu": TIEU_NGU,
        "can_cu_template": CAN_CU_TEMPLATE,
        "cong_van_abbrevs": sorted(CONG_VAN_ABBREVS),
        "co_ten_loai_abbrevs": sorted(CO_TEN_LOAI_ABBREVS),
    }
