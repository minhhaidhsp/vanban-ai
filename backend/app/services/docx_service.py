"""
DOCX generation service — python-docx.

Converts an Nd30Data dict into an A4 Word document following NĐ30/2020 formatting:
  - Font: Times New Roman 13pt
  - Margins: top/bottom 20mm, left 30mm, right 20mm
"""
import asyncio
import io
import logging
import re
from typing import Any

from docx import Document
from docx.shared import Pt, Cm
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

logger = logging.getLogger(__name__)


# ── Helpers ──────────────────────────────────────────────────────────────────

def _strip_html(html: str) -> str:
    """Strip HTML tags, return plain text preserving newlines at </p><br>."""
    if not html:
        return ""
    text = re.sub(r"<br\s*/?>", "\n", html, flags=re.IGNORECASE)
    text = re.sub(r"</p>", "\n", text, flags=re.IGNORECASE)
    text = re.sub(r"<[^>]+>", "", text)
    return re.sub(r"\n{3,}", "\n\n", text).strip()


def _set_font(run, name: str = "Times New Roman", size_pt: float = 13,
              bold: bool = False, italic: bool = False):
    run.font.name = name
    run.font.size = Pt(size_pt)
    run.font.bold = bold
    run.font.italic = italic


def _set_para_font(para, name: str = "Times New Roman", size_pt: float = 13,
                   bold: bool = False, italic: bool = False,
                   align: WD_ALIGN_PARAGRAPH = WD_ALIGN_PARAGRAPH.LEFT):
    para.alignment = align
    for run in para.runs:
        _set_font(run, name, size_pt, bold, italic)


def _add_para(doc: Document, text: str, bold: bool = False, italic: bool = False,
              size_pt: float = 13,
              align: WD_ALIGN_PARAGRAPH = WD_ALIGN_PARAGRAPH.LEFT) -> Any:
    para = doc.add_paragraph()
    run = para.add_run(text)
    _set_font(run, size_pt=size_pt, bold=bold, italic=italic)
    para.alignment = align
    para.paragraph_format.space_before = Pt(0)
    para.paragraph_format.space_after = Pt(0)
    return para


# ── Main ─────────────────────────────────────────────────────────────────────

def _build_docx(data: dict[str, Any]) -> bytes:
    try:
        return _build_docx_impl(data)
    except Exception as exc:
        logger.error("DOCX generation failed: %s", exc, exc_info=True)
        raise


def _build_docx_impl(data: dict[str, Any]) -> bytes:
    doc = Document()

    # Page margins (NĐ30: top 20–25mm, bottom 20–25mm, left 30–35mm, right 15–20mm)
    section = doc.sections[0]
    section.top_margin    = Cm(2.0)
    section.bottom_margin = Cm(2.0)
    section.left_margin   = Cm(3.0)
    section.right_margin  = Cm(2.0)

    # Default style
    style = doc.styles["Normal"]
    style.font.name = "Times New Roman"
    style.font.size = Pt(13)

    loai         = data.get("loaiVanBan", "QĐ")
    cq_chu_quan  = data.get("coQuanChuQuan", "")
    cq_ban_hanh  = data.get("coQuanBanHanh", "")
    so_ky_hieu   = data.get("soKyHieu", "")
    dia_danh     = data.get("diaDanh", "")
    ngay_thang   = data.get("ngayThang", "")
    trich_yeu    = data.get("trichYeu", "")
    kinh_gui     = data.get("kinhGui", "")
    can_cu_html  = data.get("canCu", "")
    noi_dung_html = data.get("noiDung", "")
    quyen_han    = data.get("quyenHanKy", "")
    chuc_vu      = data.get("chucVuKy", "")
    ho_ten       = data.get("hoTenKy", "")
    noi_nhan     = data.get("noiNhan", []) or []

    # VAN_BAN_TYPES mapping (abbreviation → display name)
    _ABBR_MAP = {
        "NQ": "NGHỊ QUYẾT", "QĐ": "QUYẾT ĐỊNH", "CT": "CHỈ THỊ",
        "CV": "CÔNG VĂN", "TB": "THÔNG BÁO", "HD": "HƯỚNG DẪN",
        "BC": "BÁO CÁO", "TTr": "TỜ TRÌNH", "KH": "KẾ HOẠCH",
        "BB": "BIÊN BẢN", "GM": "GIẤY MỜI",
    }
    ten_loai = _ABBR_MAP.get(loai, loai.upper())

    # ── Header 2-column table ─────────────────────────────────────────
    tbl = doc.add_table(rows=1, cols=2)
    tbl.style = "Table Grid"
    tbl.style = doc.styles["Normal Table"]

    left_cell  = tbl.cell(0, 0)
    right_cell = tbl.cell(0, 1)

    # Remove cell borders
    for cell in [left_cell, right_cell]:
        for side in ("top", "left", "bottom", "right"):
            tc = cell._tc
            tcPr = tc.get_or_add_tcPr()
            tcBorders = OxmlElement("w:tcBorders")
            border = OxmlElement(f"w:{side}")
            border.set(qn("w:val"), "none")
            tcBorders.append(border)
            tcPr.append(tcBorders)

    # Left cell: cơ quan
    lp = left_cell.paragraphs[0]
    if cq_chu_quan:
        r = lp.add_run(cq_chu_quan.upper())
        _set_font(r, size_pt=12); lp.alignment = WD_ALIGN_PARAGRAPH.CENTER
        lp = left_cell.add_paragraph()
    r = lp.add_run(cq_ban_hanh.upper())
    _set_font(r, size_pt=12, bold=True); lp.alignment = WD_ALIGN_PARAGRAPH.CENTER

    lp2 = left_cell.add_paragraph("─" * 20)
    lp2.alignment = WD_ALIGN_PARAGRAPH.CENTER

    lp3 = left_cell.add_paragraph(f"Số: {so_ky_hieu}")
    _set_para_font(lp3, align=WD_ALIGN_PARAGRAPH.CENTER)

    # Right cell: quốc hiệu
    rp = right_cell.paragraphs[0]
    r = rp.add_run("CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM")
    _set_font(r, size_pt=12, bold=True); rp.alignment = WD_ALIGN_PARAGRAPH.CENTER

    rp2 = right_cell.add_paragraph("Độc lập - Tự do - Hạnh phúc")
    _set_para_font(rp2, bold=True, align=WD_ALIGN_PARAGRAPH.CENTER)

    rp3 = right_cell.add_paragraph("─" * 30)
    rp3.alignment = WD_ALIGN_PARAGRAPH.CENTER

    dia_ngay = ", ".join(filter(None, [dia_danh, ngay_thang]))
    rp4 = right_cell.add_paragraph(dia_ngay)
    _set_para_font(rp4, italic=True, align=WD_ALIGN_PARAGRAPH.CENTER)

    doc.add_paragraph()

    # ── Tên loại + trích yếu ─────────────────────────────────────────
    _add_para(doc, ten_loai, bold=True, size_pt=14, align=WD_ALIGN_PARAGRAPH.CENTER)
    if trich_yeu:
        _add_para(doc, trich_yeu, bold=True, size_pt=13, align=WD_ALIGN_PARAGRAPH.CENTER)

    # Underline divider
    p_div = doc.add_paragraph("─" * 40)
    p_div.alignment = WD_ALIGN_PARAGRAPH.CENTER
    doc.add_paragraph()

    # ── Kính gửi ─────────────────────────────────────────────────────
    if kinh_gui:
        _add_para(doc, f"Kính gửi: {kinh_gui}", size_pt=13,
                  align=WD_ALIGN_PARAGRAPH.LEFT)
        doc.add_paragraph()

    # ── Căn cứ ───────────────────────────────────────────────────────
    can_cu_text = _strip_html(can_cu_html)
    if can_cu_text:
        for line in can_cu_text.split("\n"):
            line = line.strip()
            if line:
                _add_para(doc, line, italic=True, size_pt=13,
                          align=WD_ALIGN_PARAGRAPH.JUSTIFY)
        doc.add_paragraph()

    # ── Nội dung ─────────────────────────────────────────────────────
    noi_dung_text = _strip_html(noi_dung_html)
    if noi_dung_text:
        for block in noi_dung_text.split("\n"):
            block = block.strip()
            if block:
                _add_para(doc, block, size_pt=13, align=WD_ALIGN_PARAGRAPH.JUSTIFY)

    doc.add_paragraph()
    doc.add_paragraph()

    # ── Footer: Nơi nhận + Chữ ký ────────────────────────────────────
    ftr = doc.add_table(rows=1, cols=2)
    ftr.style = doc.styles["Normal Table"]
    fl = ftr.cell(0, 0)
    fr = ftr.cell(0, 1)

    # Remove borders
    for cell in [fl, fr]:
        tc = cell._tc
        tcPr = tc.get_or_add_tcPr()
        tcBorders = OxmlElement("w:tcBorders")
        for side in ("top", "left", "bottom", "right"):
            border = OxmlElement(f"w:{side}")
            border.set(qn("w:val"), "none")
            tcBorders.append(border)
        tcPr.append(tcBorders)

    lp = fl.paragraphs[0]
    r = lp.add_run("Nơi nhận:")
    _set_font(r, bold=True, italic=True, size_pt=12)
    for item in noi_nhan:
        p = fl.add_paragraph(item if item.startswith("-") else f"- {item}")
        _set_para_font(p, size_pt=11)

    rp = fr.paragraphs[0]
    r = rp.add_run(quyen_han.upper() if quyen_han else "")
    _set_font(r, bold=True, size_pt=13); rp.alignment = WD_ALIGN_PARAGRAPH.CENTER

    if chuc_vu:
        p_cv = fr.add_paragraph(chuc_vu.upper())
        _set_para_font(p_cv, bold=True, size_pt=13, align=WD_ALIGN_PARAGRAPH.CENTER)

    # Signature gap
    for _ in range(4):
        p_gap = fr.add_paragraph("")
        p_gap.alignment = WD_ALIGN_PARAGRAPH.CENTER

    if ho_ten:
        p_ht = fr.add_paragraph(ho_ten)
        _set_para_font(p_ht, bold=True, size_pt=13, align=WD_ALIGN_PARAGRAPH.CENTER)

    buf = io.BytesIO()
    doc.save(buf)
    return buf.getvalue()


async def generate_docx(data: dict[str, Any]) -> bytes:
    """Render Nd30Data dict → DOCX bytes (runs python-docx in a thread)."""
    return await asyncio.to_thread(_build_docx, data)
