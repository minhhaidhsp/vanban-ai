"""
PDF generation service — xhtml2pdf + ReportLab with DejaVu Serif.

Converts an Nd30Data dict (parsed from document.content JSON)
into an A4 PDF that matches DocumentPreview.tsx layout exactly.
"""
import asyncio
import html as _html
import io
import logging
import os
from typing import Any

logger = logging.getLogger(__name__)

FONTS_DIR = os.path.normpath(
    os.path.join(os.path.dirname(__file__), "..", "static", "fonts")
)

# ── Type registry (mirrors nd30.ts VAN_BAN_TYPES + VAN_BAN_TEMPLATES) ────────
# (full_name, has_type_name, has_kinh_gui)
_VB: dict[str, tuple[str, bool, bool]] = {
    "NQ":  ("Nghị quyết",        True,  False),
    "QĐ":  ("Quyết định",        True,  False),
    "CT":  ("Chỉ thị",           True,  False),
    "QC":  ("Quy chế",           True,  False),
    "TC":  ("Thông cáo",         True,  False),
    "TB":  ("Thông báo",         True,  False),
    "HD":  ("Hướng dẫn",         True,  False),
    "CTr": ("Chương trình",      True,  False),
    "KH":  ("Kế hoạch",          True,  False),
    "PA":  ("Phương án",         True,  False),
    "BC":  ("Báo cáo",           True,  False),
    "BB":  ("Biên bản",          True,  False),
    "TTr": ("Tờ trình",          True,  False),
    "CĐ":  ("Công điện",         True,  False),
    "CV":  ("Công văn",          False, True),
    "GM":  ("Giấy mời",          False, False),
    "GGT": ("Giấy giới thiệu",   False, True),
    "GNP": ("Giấy nghỉ phép",    False, False),
}

_FONTS_REGISTERED = False
_XHTML2PDF_PATCHED = False
_FONT_B64_CACHE: dict[str, str] = {}


def _patch_xhtml2pdf_font_loader() -> None:
    """
    xhtml2pdf writes font data to a Windows temp path like
    C:\\Users\\ADMINI~1\\AppData\\Local\\Temp\\tmpXXX and then passes that
    path string to ReportLab's TTFont().  ReportLab's open_for_read()
    fails with PermissionError / 'unknown url type: c' on Windows 8.3 paths.

    Fix: replace the temp-file lookup with BytesIO(file.getData()) so
    the font bytes go straight to ReportLab without touching the filesystem.
    """
    global _XHTML2PDF_PATCHED
    if _XHTML2PDF_PATCHED:
        return

    import io as _io
    from reportlab.lib.fonts import addMapping as _addMapping
    from reportlab.pdfbase import pdfmetrics as _pm
    from reportlab.pdfbase.ttfonts import TTFont as _TTFont
    from xhtml2pdf import context as _ctx
    from xhtml2pdf.files import B64InlineURI as _B64

    _orig = _ctx.pisaContext.loadFont

    def _patched_loadFont(self, names, src, encoding="WinAnsiEncoding", bold=0, italic=0):
        if not (names and src):
            return _orig(self, names, src, encoding=encoding, bold=bold, italic=italic)

        pisa_file = src
        src_uri: str = pisa_file.uri or ""

        # Detect TTF (same logic as xhtml2pdf original)
        is_ttf = False
        if isinstance(pisa_file.instance, _B64):
            if pisa_file.getMimeType() == "font/ttf":
                is_ttf = True
        elif src_uri.lower().split("?")[0].endswith((".ttf", ".ttc")):
            is_ttf = True

        if not is_ttf:
            return _orig(self, names, src, encoding=encoding, bold=bold, italic=italic)

        # Build fontAlias list (mirrors original)
        if isinstance(names, list):
            fontAlias = names
        else:
            fontAlias = [x.lower().strip() for x in names.split(",") if x]
        fontAlias = [str(x) for x in fontAlias]
        fontName = fontAlias[0]
        fullFontName = "%s_%d%d" % (fontName, bold, italic)

        if fullFontName in self.fontList:
            return  # already registered

        font_data = pisa_file.getData()
        if not font_data:
            logger.warning("No font data for %s, skipping", src_uri)
            return

        try:
            tt = _TTFont(fullFontName, _io.BytesIO(font_data))
            _pm.registerFont(tt)
            for b in (0, 1):
                for i in (0, 1):
                    if "%s_%d%d" % (fontName, b, i) not in self.fontList:
                        _addMapping(fontName, b, i, fullFontName)
            self.registerFont(fontName, [*fontAlias, fullFontName])
        except Exception as exc:
            logger.warning("Font load failed for %s: %s", src_uri, exc)

    _ctx.pisaContext.loadFont = _patched_loadFont
    _XHTML2PDF_PATCHED = True


def _ensure_fonts() -> str:
    """
    Register DejaVu Serif from static/fonts/ and cache base64 data: URIs.
    Returns the CSS font-family name to use in the HTML template.
    """
    global _FONTS_REGISTERED, _FONT_B64_CACHE
    if _FONTS_REGISTERED:
        return "DejaVuSerif" if _FONT_B64_CACHE else "Times New Roman"

    import base64
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont

    font_map = [
        ("DejaVuSerif",            "DejaVuSerif.ttf"),
        ("DejaVuSerif-Bold",       "DejaVuSerif-Bold.ttf"),
        ("DejaVuSerif-Italic",     "DejaVuSerif-Italic.ttf"),
        ("DejaVuSerif-BoldItalic", "DejaVuSerif-BoldItalic.ttf"),
    ]
    registered: set[str] = set()
    for name, fname in font_map:
        path = os.path.join(FONTS_DIR, fname)
        if os.path.exists(path):
            try:
                with open(path, "rb") as fh:
                    raw = fh.read()
                pdfmetrics.registerFont(TTFont(name, io.BytesIO(raw)))
                _FONT_B64_CACHE[name] = base64.b64encode(raw).decode("ascii")
                registered.add(name)
            except Exception as exc:
                logger.warning("Font registration failed for %s: %s", name, exc)

    if "DejaVuSerif" in registered:
        pdfmetrics.registerFontFamily(
            "DejaVuSerif",
            normal="DejaVuSerif",
            bold="DejaVuSerif-Bold" if "DejaVuSerif-Bold" in registered else "DejaVuSerif",
            italic="DejaVuSerif-Italic" if "DejaVuSerif-Italic" in registered else "DejaVuSerif",
            boldItalic="DejaVuSerif-BoldItalic" if "DejaVuSerif-BoldItalic" in registered else "DejaVuSerif",
        )
        _FONTS_REGISTERED = True
        return "DejaVuSerif"

    _FONTS_REGISTERED = True
    return "Times New Roman"


def _build_css(font: str) -> str:
    # Use base64 data: URIs so xhtml2pdf doesn't need to read from disk.
    # file:/// URIs fail on Windows because xhtml2pdf's getFile() returns notFound().
    def face(name: str) -> str:
        b64 = _FONT_B64_CACHE.get(name, "")
        if not b64:
            return ""
        return f"@font-face {{ font-family: '{name}'; src: url(data:font/ttf;base64,{b64}); }}"

    font_faces = "\n".join(filter(None, [
        face(font),
        face(f"{font}-Bold"),
        face(f"{font}-Italic"),
        face(f"{font}-BoldItalic"),
    ]))

    return f"""
{font_faces}

@page {{
    size: A4;
    margin: 25mm 20mm 25mm 30mm;
}}
* {{ box-sizing: border-box; }}
body {{
    font-family: '{font}', serif;
    font-size: 14pt;
    line-height: 1.5;
    color: #000;
    margin: 0;
    padding: 0;
}}
b, strong {{ font-family: '{font}-Bold', serif; }}
i, em     {{ font-family: '{font}-Italic', serif; }}

/* ── 2-column header ─────────────────────────────────────────── */
.hdr {{ width: 100%; border-collapse: collapse; }}
.col-l {{ width: 45%; vertical-align: top; padding-right: 2mm; }}
.col-r {{ width: 55%; vertical-align: top; padding-left: 2mm; }}

/* ── Cột trái ────────────────────────────────────────────────── */
.cq-chu-quan {{ font-size: 13pt; text-transform: uppercase; text-align: center; }}
.cq-ban-hanh {{ font-size: 13pt; font-weight: bold; text-transform: uppercase; text-align: center; }}
.so-kh {{ font-size: 13pt; text-align: center; }}
.do-box {{
    font-size: 13pt; font-weight: bold; text-transform: uppercase;
    text-align: center; border: 1pt solid #000; padding: 2px 8px;
    margin: 2mm auto 0;
}}

/* ── Cột phải ────────────────────────────────────────────────── */
.quoc-hieu {{
    font-size: 12pt; font-weight: bold; text-transform: uppercase;
    text-align: center; letter-spacing: 0.5px;
    white-space: nowrap;
}}
.tieu-ngu-wrap {{ text-align: center; margin-bottom: 4mm; }}
.tieu-ngu {{
    font-size: 14pt; font-weight: bold;
    border-bottom: 1.5pt solid #000; padding-bottom: 1px;
    white-space: nowrap;
}}
.dia-danh {{
    font-size: 12pt; font-style: italic; text-align: center;
    white-space: nowrap;
}}

/* ── Tên loại + trích yếu ────────────────────────────────────── */
.ten-loai-sec {{ text-align: center; margin: 4mm 0 2mm; }}
.ten-loai-vb  {{ font-size: 14pt; font-weight: bold; text-transform: uppercase; }}
.trich-yeu-c  {{ font-size: 14pt; font-weight: bold; }}
.trich-yeu-cv {{ font-size: 13pt; }}

/* ── Kính gửi ────────────────────────────────────────────────── */
.kinh-gui {{ font-size: 14pt; margin: 2mm 0 3mm; }}

/* ── Căn cứ / Nội dung ───────────────────────────────────────── */
.can-cu  {{ font-size: 14pt; line-height: 1.6; font-style: italic; margin-bottom: 3mm; }}
.noi-dung {{ font-size: 14pt; line-height: 1.6; text-align: justify; margin-bottom: 6mm; }}
.can-cu p, .noi-dung p {{ margin: 0 0 0.35em 0; }}
.can-cu ul, .can-cu ol, .noi-dung ul, .noi-dung ol {{ margin: 0 0 0.35em 1.6em; padding: 0; }}
.can-cu li, .noi-dung li {{ margin: 0.1em 0; }}
.can-cu h1, .can-cu h2, .can-cu h3,
.noi-dung h1, .noi-dung h2, .noi-dung h3 {{ font-weight: bold; margin: 0.3em 0; }}

/* ── Footer: Nơi nhận + Chữ ký ──────────────────────────────── */
.ftr  {{ width: 100%; border-collapse: collapse; margin-top: 4mm; }}
.ftr-l {{ width: 50%; vertical-align: top; padding-right: 2mm; }}
.ftr-r {{ width: 50%; vertical-align: top; padding-left: 2mm; text-align: center; }}
.nn-label {{ font-size: 12pt; font-weight: bold; font-style: italic; }}
.nn-item  {{ font-size: 11pt; }}
.quyen-han {{ font-size: 14pt; font-weight: bold; text-transform: uppercase; margin-bottom: 2px; }}
.chuc-vu   {{ font-size: 14pt; font-weight: bold; text-transform: uppercase; }}
.ky-gap    {{ height: 18mm; }}
.ho-ten    {{ font-size: 14pt; font-weight: bold; }}
"""


def _e(v: Any) -> str:
    return _html.escape(str(v or ""))


def _build_body(data: dict[str, Any]) -> str:
    loai            = data.get("loaiVanBan", "QĐ")
    full_name, has_type_name, has_kinh_gui = _VB.get(loai, ("Văn bản", True, False))
    cq_chu_quan     = data.get("coQuanChuQuan", "")
    cq_ban_hanh     = data.get("coQuanBanHanh", "")
    so_ky_hieu      = data.get("soKyHieu", "")
    dia_danh        = data.get("diaDanh", "")
    ngay_thang      = data.get("ngayThang", "")
    trich_yeu       = data.get("trichYeu", "")
    kinh_gui        = data.get("kinhGui", "")
    do_mat          = data.get("doMat", "Thường")
    do_khan         = data.get("doKhan", "Thường")
    can_cu          = data.get("canCu", "")
    noi_dung        = data.get("noiDung", "")
    quyen_han       = data.get("quyenHanKy", "")
    chuc_danh_tt    = data.get("chucDanhTapThe", "")
    chuc_vu         = data.get("chucVuKy", "")
    ho_ten          = data.get("hoTenKy", "")
    noi_nhan        = data.get("noiNhan", []) or []

    parts: list[str] = []

    # ── Header 2 cột ─────────────────────────────────────────────
    col_l_parts: list[str] = []
    if cq_chu_quan:
        col_l_parts.append(f'<div class="cq-chu-quan">{_e(cq_chu_quan)}</div>')
    col_l_parts.append(f'<div class="cq-ban-hanh">{_e(cq_ban_hanh)}</div>')
    col_l_parts.append('<hr style="height:1.5px;background:#000;width:50%;margin:2px auto 4px;border:none;" />')
    col_l_parts.append(
        f'<div class="so-kh">Số: <i>{_e(so_ky_hieu)}</i></div>'
    )
    if do_mat != "Thường":
        col_l_parts.append(f'<div class="do-box">{_e(do_mat)}</div>')
    if do_khan != "Thường":
        col_l_parts.append(f'<div class="do-box">{_e(do_khan)}</div>')

    dia_danh_ngay = ", ".join(filter(None, [dia_danh, ngay_thang]))
    col_r_html = (
        '<div class="quoc-hieu">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>'
        '<div class="tieu-ngu-wrap">'
        '<span class="tieu-ngu">Độc lập - Tự do - Hạnh phúc</span>'
        '</div>'
        f'<div class="dia-danh">{_e(dia_danh_ngay)}</div>'
    )

    parts.append(
        '<table class="hdr"><tr>'
        f'<td class="col-l">{"".join(col_l_parts)}</td>'
        f'<td class="col-r">{col_r_html}</td>'
        '</tr></table>'
    )

    # ── Tên loại + Trích yếu ─────────────────────────────────────
    if has_type_name:
        parts.append(
            '<div class="ten-loai-sec">'
            f'<div class="ten-loai-vb">{_e(full_name.upper())}</div>'
            f'<div class="trich-yeu-c">{_e(trich_yeu)}</div>'
            '<hr style="height:1.5px;background:#000;width:40%;margin:3px auto 0;border:none;" />'
            '</div>'
        )
    else:
        parts.append(
            '<div class="ten-loai-sec">'
            f'<div class="trich-yeu-cv">{_e(trich_yeu)}</div>'
            '</div>'
        )

    # ── Kính gửi ─────────────────────────────────────────────────
    if has_kinh_gui and kinh_gui:
        parts.append(
            f'<div class="kinh-gui">Kính gửi: {_e(kinh_gui)}</div>'
        )

    # ── Căn cứ ───────────────────────────────────────────────────
    if can_cu and can_cu.strip() and can_cu not in ("<p></p>", "<p> </p>"):
        parts.append(f'<div class="can-cu">{can_cu}</div>')

    # ── Nội dung ─────────────────────────────────────────────────
    parts.append(f'<div class="noi-dung">{noi_dung or ""}</div>')

    # ── Footer: Nơi nhận + Chữ ký ────────────────────────────────
    nn_items = "".join(
        f'<div class="nn-item">{_e(x if x.startswith("-") else f"- {x}")}</div>'
        for x in noi_nhan
    )
    quyen_han_full = " ".join(filter(None, [quyen_han, chuc_danh_tt]))
    sig_parts = [f'<div class="quyen-han">{_e(quyen_han_full)}</div>']
    if chuc_vu:
        sig_parts.append(f'<div class="chuc-vu">{_e(chuc_vu)}</div>')
    sig_parts.append('<div class="ky-gap">&nbsp;</div>')
    if ho_ten:
        sig_parts.append(f'<div class="ho-ten">{_e(ho_ten)}</div>')

    parts.append(
        '<table class="ftr"><tr>'
        f'<td class="ftr-l"><div class="nn-label">Nơi nhận:</div>{nn_items}</td>'
        f'<td class="ftr-r">{"".join(sig_parts)}</td>'
        '</tr></table>'
    )

    return "\n".join(parts)


def _render_html(data: dict[str, Any]) -> str:
    font = _ensure_fonts()
    css = _build_css(font)
    body = _build_body(data)
    return (
        "<!DOCTYPE html>\n"
        "<html lang='vi'>\n"
        "<head>\n"
        "  <meta charset='UTF-8'>\n"
        f"  <style>{css}</style>\n"
        "</head>\n"
        "<body>\n"
        + body
        + "\n</body>\n</html>"
    )


def _write_pdf(html_str: str) -> bytes:
    _patch_xhtml2pdf_font_loader()
    from xhtml2pdf import pisa
    buf = io.BytesIO()
    result = pisa.CreatePDF(io.StringIO(html_str), dest=buf, encoding="utf-8")
    if result.err:
        raise RuntimeError(f"xhtml2pdf error code {result.err}")
    return buf.getvalue()


async def generate_pdf(data: dict[str, Any]) -> bytes:
    """Render Nd30Data dict → PDF bytes (runs xhtml2pdf in a thread)."""
    html_str = _render_html(data)
    return await asyncio.to_thread(_write_pdf, html_str)
