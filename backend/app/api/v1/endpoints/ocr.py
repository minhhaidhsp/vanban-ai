"""
OCR endpoints — async job-based (DB + Redis) + stateless export.

POST /extract   → create OcrJob (202), run OCR in background
POST /export    → stateless text→DOCX/PDF (unchanged)
GET  /jobs      → list jobs for current user
GET  /status/{job_id} → lightweight poll (no text payload)
GET  /{job_id}  → full job detail

Route ordering: /jobs and /status/{id} MUST come before /{id}.
"""
import asyncio
import base64
import io
import logging
import re
import uuid
from urllib.parse import quote

from fastapi import (
    APIRouter, BackgroundTasks, Body, Depends,
    File, HTTPException, Response, UploadFile, status,
)
from sqlalchemy import func as sql_func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import AsyncSessionLocal, get_db
from app.core.redis import get_redis
from app.models.ocr_job import OcrJob
from app.models.user import User
from app.schemas.ocr_job import OcrJobListResponse, OcrJobResponse, OcrJobStatusResponse

logger = logging.getLogger(__name__)
router = APIRouter()

_ALLOWED_TYPES = {
    "application/pdf",
    "image/jpeg",
    "image/jpg",
    "image/png",
}
_MAX_BYTES = 20 * 1024 * 1024  # 20 MB
_REDIS_TTL = 3600               # 1 hour


# ── LLM text formatter ───────────────────────────────────────────────────────

def _basic_format(text: str) -> str:
    """Fallback: normalize whitespace when LLM is unavailable."""
    import re
    text = re.sub(r'\n{3,}', '\n\n', text)
    text = re.sub(r' {2,}', ' ', text)
    return text.strip()


async def _format_ocr_text(raw_text: str, filename: str) -> str:
    """Use LLM to reformat raw OCR text into clean, readable Vietnamese text."""
    # Cap at 8000 chars to stay well within Groq context / avoid timeout
    truncated = raw_text[:8000] if len(raw_text) > 8000 else raw_text

    system_prompt = (
        "Bạn là trợ lý chuyên xử lý văn bản tiếng Việt được trích xuất từ OCR.\n"
        "Nhiệm vụ: nhận text OCR thô (có thể bị lỗi định dạng, dính chữ, mất xuống dòng) "
        "và tái cấu trúc lại thành văn bản có định dạng đẹp, dễ đọc.\n\n"
        "Nguyên tắc:\n"
        "- Giữ NGUYÊN nội dung, KHÔNG thêm hoặc bịa thông tin\n"
        "- Tách đúng các đoạn văn, tiêu đề, danh sách\n"
        "- Nếu là văn bản hành chính (công văn, quyết định...): giữ cấu trúc quốc hiệu, "
        "số ký hiệu, trích yếu, nội dung, chữ ký\n"
        "- Nếu là biểu mẫu (tờ khai, hợp đồng...): giữ cấu trúc các mục, trường thông tin\n"
        "- Nếu là văn bản thông thường: tách paragraph hợp lý\n"
        "- Dùng dấu xuống dòng \\n để phân tách đoạn\n"
        "- KHÔNG thêm markdown (không dùng **, ##, -)\n"
        "- Chỉ trả về văn bản đã tái cấu trúc, KHÔNG giải thích gì thêm"
    )
    user_prompt = f"Tên file: {filename}\n\nText OCR cần tái cấu trúc:\n{truncated}"

    try:
        from app.services.llm_service import llm_service
        result = await llm_service.chat(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.1,
            max_tokens=4000,
        )
        return result.strip() if result else raw_text
    except Exception as exc:
        logger.warning("[ocr_format] LLM failed: %s — falling back to basic format", exc)
        return _basic_format(raw_text)


# ── Background processor ──────────────────────────────────────────────────────

async def _process_ocr_job(job_id: str) -> None:
    """
    Background task: OCR the cached file bytes and persist result.

    Three separate DB sessions to avoid using a rolled-back session for the
    error-state update (same pattern as pipeline_service.py).
    Redis stores file bytes as base64 because the client uses decode_responses=True.
    """

    # ── Phase 1: mark as processing, capture filename ─────────────────────
    filename = ""
    try:
        async with AsyncSessionLocal() as db:
            result = await db.execute(select(OcrJob).where(OcrJob.id == job_id))
            job = result.scalar_one_or_none()
            if not job:
                logger.warning("[ocr_job] %s not found in DB — skipping", job_id)
                return
            filename = job.filename or ""
            job.status = "processing"
            await db.commit()
    except Exception as exc:
        logger.exception("[ocr_job] %s failed to mark processing: %s", job_id, exc)
        return

    # ── Phase 2: OCR work + LLM formatting ───────────────────────────────
    extracted_text: str = ""
    formatted: str = ""
    page_count: int = 1
    error_msg: str | None = None

    try:
        redis = await get_redis()
        raw = await redis.get(f"ocr_file:{job_id}")
        if not raw:
            raise RuntimeError("File không còn trong cache")

        # decode_responses=True → raw is str; base64.b64decode accepts str directly
        content: bytes = base64.b64decode(raw)
        is_pdf = filename.lower().endswith(".pdf")

        if is_pdf:
            from app.services.pipeline_service import _extract_pdf
            extracted_text = await asyncio.to_thread(_extract_pdf, content)

            try:
                import pdfplumber
                with pdfplumber.open(io.BytesIO(content)) as pdf:
                    page_count = len(pdf.pages)
            except Exception:
                page_count = 1

        else:
            def _ocr_image(data: bytes) -> str:
                import sys
                import pytesseract
                from PIL import Image

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

        # Cleanup Redis (best-effort — TTL covers it if this fails)
        await redis.delete(f"ocr_file:{job_id}")
        logger.info(
            "[ocr_job] %s OCR done: %d chars, %d pages", job_id, len(extracted_text), page_count
        )

        # LLM formatting step — non-fatal, falls back to _basic_format on error
        formatted = await _format_ocr_text(extracted_text, filename)
        logger.info("[ocr_job] %s formatted: %d chars", job_id, len(formatted))

    except Exception as exc:
        logger.exception("[ocr_job] %s OCR failed: %s", job_id, exc)
        error_msg = str(exc)[:500]

    # ── Phase 3: persist result (fresh session — always runs) ─────────────
    try:
        async with AsyncSessionLocal() as db:
            result = await db.execute(select(OcrJob).where(OcrJob.id == job_id))
            job = result.scalar_one_or_none()
            if not job:
                return
            if error_msg:
                job.status = "error"
                job.error_msg = error_msg
            else:
                job.status = "done"
                job.text = extracted_text
                job.formatted_text = formatted
                job.page_count = page_count
                job.char_count = len(extracted_text)
            await db.commit()
    except Exception as exc:
        logger.exception("[ocr_job] %s failed to persist result: %s", job_id, exc)


# ── POST /extract ─────────────────────────────────────────────────────────────

@router.post("/extract", response_model=OcrJobResponse, status_code=status.HTTP_202_ACCEPTED)
async def ocr_extract(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Start async OCR job. Returns OcrJob (status=pending) immediately."""
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

    job = OcrJob(
        id=str(uuid.uuid4()),
        user_id=str(current_user.id),
        filename=file.filename or "unknown",
        status="pending",
    )
    db.add(job)
    await db.flush()
    await db.commit()

    # Store bytes in Redis as base64 (decode_responses=True → no binary values)
    redis = await get_redis()
    await redis.set(
        f"ocr_file:{job.id}",
        base64.b64encode(content).decode(),
        ex=_REDIS_TTL,
    )

    background_tasks.add_task(_process_ocr_job, job.id)
    logger.info("[ocr] queued job=%s file=%s bytes=%d", job.id, job.filename, len(content))
    return job


# ── POST /export ──────────────────────────────────────────────────────────────

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


# ── GET /jobs ─────────────────────────────────────────────────────────────────

@router.get("/jobs", response_model=OcrJobListResponse)
async def list_ocr_jobs(
    skip: int = 0,
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List OCR jobs for the current user, newest first."""
    base = select(OcrJob).where(OcrJob.user_id == str(current_user.id))

    total_result = await db.execute(
        select(sql_func.count()).select_from(base.subquery())
    )
    total = total_result.scalar() or 0

    items_result = await db.execute(
        base.order_by(OcrJob.created_at.desc()).offset(skip).limit(limit)
    )
    items = items_result.scalars().all()

    return OcrJobListResponse(items=list(items), total=total)


# ── GET /status/{job_id} ──────────────────────────────────────────────────────

@router.get("/status/{job_id}", response_model=OcrJobStatusResponse)
async def get_ocr_status(
    job_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lightweight status poll — no text payload in response."""
    result = await db.execute(
        select(OcrJob).where(
            OcrJob.id == job_id,
            OcrJob.user_id == str(current_user.id),
        )
    )
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    return job


# ── GET /{job_id} ─────────────────────────────────────────────────────────────

@router.get("/{job_id}", response_model=OcrJobResponse)
async def get_ocr_job(
    job_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Full job detail including extracted text."""
    result = await db.execute(
        select(OcrJob).where(
            OcrJob.id == job_id,
            OcrJob.user_id == str(current_user.id),
        )
    )
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    return job
