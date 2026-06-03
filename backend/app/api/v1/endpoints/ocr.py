"""
Stateless OCR endpoints — no DB or storage writes.
"""
import asyncio
import io
import logging
import re
from urllib.parse import quote

from fastapi import APIRouter, Body, Depends, File, HTTPException, Response, UploadFile, status

from app.api.deps import get_current_user
from app.models.user import User

logger = logging.getLogger(__name__)
router = APIRouter()

_ALLOWED_TYPES = {
    "application/pdf",
    "image/jpeg",
    "image/jpg",
    "image/png",
}
_MAX_BYTES = 20 * 1024 * 1024  # 20 MB


# ── Extract ───────────────────────────────────────────────────────────────────

@router.post("/extract")
async def ocr_extract(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    """OCR a PDF or image and return extracted text (stateless — nothing saved)."""
    content_type = (file.content_type or "").lower()
    if content_type not in _ALLOWED_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Chỉ hỗ trợ PDF, JPG, PNG",
        )

    content = await file.read()
    if len(content) > _MAX_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File quá lớn, tối đa 20MB",
        )

    is_pdf = "pdf" in content_type

    if is_pdf:
        # _extract_pdf(bytes) handles its own temp file + OCR fallback internally
        from app.services.pipeline_service import _extract_pdf

        extracted_text = await asyncio.to_thread(_extract_pdf, content)

        page_count = 1
        try:
            import pdfplumber
            with pdfplumber.open(io.BytesIO(content)) as pdf:
                page_count = len(pdf.pages)
        except Exception:
            pass
    else:
        # Image OCR via PIL + pytesseract
        def _ocr_image(data: bytes) -> str:
            import sys
            import pytesseract
            from PIL import Image  # Pillow installed as pdf2image dependency

            if sys.platform == "win32":
                pytesseract.pytesseract.tesseract_cmd = (
                    r"C:\Program Files\Tesseract-OCR\tesseract.exe"
                )
            img = Image.open(io.BytesIO(data))
            try:
                return pytesseract.image_to_string(img, lang="vie")
            except Exception:
                return pytesseract.image_to_string(img, lang="eng")

        extracted_text = await asyncio.to_thread(_ocr_image, content)
        page_count = 1

    return {
        "filename": file.filename,
        "text": extracted_text,
        "char_count": len(extracted_text),
        "page_count": page_count,
    }


# ── Export ────────────────────────────────────────────────────────────────────

@router.post("/export")
async def ocr_export(
    text: str = Body(...),
    filename: str = Body("van-ban-ocr"),
    format: str = Body("docx"),
    current_user: User = Depends(get_current_user),
):
    """Convert OCR text to DOCX or PDF (stateless — nothing saved)."""
    if format not in ("docx", "pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="format phải là 'docx' hoặc 'pdf'",
        )

    safe_name = re.sub(r"[^\w\-.]", "_", filename)[:120]

    if format == "docx":
        from docx import Document as DocxDocument

        doc = DocxDocument()
        doc.add_heading(filename, level=1)
        doc.add_paragraph(text)
        buf = io.BytesIO()
        doc.save(buf)
        encoded = quote(f"{safe_name}.docx", safe="")
        return Response(
            content=buf.getvalue(),
            media_type=(
                "application/vnd.openxmlformats-officedocument"
                ".wordprocessingml.document"
            ),
            headers={
                "Content-Disposition": (
                    f"attachment; filename=\"vanban.docx\"; "
                    f"filename*=UTF-8''{encoded}"
                )
            },
        )

    # format == "pdf"
    import html as _html_esc
    from app.services.pdf_service import _build_css, _ensure_fonts, _write_pdf

    font = _ensure_fonts()
    css = _build_css(font)
    title_h = _html_esc.escape(filename)
    text_h = _html_esc.escape(text)
    html_str = (
        "<!DOCTYPE html>\n<html lang='vi'>\n<head>\n"
        "  <meta charset='UTF-8'>\n"
        f"  <style>{css}\n"
        f"    h1 {{ font-size: 15pt; font-weight: bold; text-align: center;"
        f" margin-bottom: 4pt; }}\n"
        f"    pre {{ white-space: pre-wrap; font-family: '{font}', serif;"
        f" font-size: 13pt; line-height: 1.6; }}\n"
        "  </style>\n</head>\n<body>\n"
        f"  <h1>{title_h}</h1>\n"
        f"  <pre>{text_h}</pre>\n"
        "</body>\n</html>"
    )
    pdf_bytes = await asyncio.to_thread(_write_pdf, html_str)
    encoded = quote(f"{safe_name}.pdf", safe="")
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": (
                f"attachment; filename=\"vanban.pdf\"; "
                f"filename*=UTF-8''{encoded}"
            )
        },
    )
