"""
Embedding pipeline for reference documents.

Called as a FastAPI BackgroundTask after a file is uploaded.
Creates its own DB session — never reuses the request session.

Flow:
  1. Fetch document record from DB
  2. Download file bytes from MinIO
  3. Extract text (PDF → pdfplumber, DOCX → python-docx)
  4. Chunk with chunking_service
  5. Embed all chunks with embedding_service
  6. Delete old reference_doc_chunks rows for this doc
  7. Bulk-insert new ReferenceDocChunk rows (one per chunk, each with its embedding)
  8. Also store first chunk's embedding on reference_documents.embedding
"""
import asyncio
import io
import logging
from typing import Optional

logger = logging.getLogger(__name__)

REF_DOCS_BUCKET = "reference-docs"


# ── Text extractors (synchronous — run via asyncio.to_thread) ───────────────

def _is_scanned_pdf(text: str) -> bool:
    return len(text.strip()) < 50


def _post_process_ocr(text: str) -> str:
    import re
    text = re.sub(r'\n{3,}', '\n\n', text)
    lines = [line.strip() for line in text.split('\n')]
    return '\n'.join(lines).strip()


def _ocr_pdf(file_path: str) -> str:
    try:
        import sys
        import pytesseract
        from pdf2image import convert_from_path

        if sys.platform == "win32":
            pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

        logger.info("[ocr] Scanning PDF: %s", file_path)
        images = convert_from_path(file_path, dpi=300)

        full_text = []
        for i, image in enumerate(images):
            logger.info("[ocr] Page %d/%d", i + 1, len(images))
            try:
                text = pytesseract.image_to_string(image, lang='vie')
            except Exception:
                text = pytesseract.image_to_string(image, lang='eng')
            full_text.append(text)

        result = _post_process_ocr("\n".join(full_text))
        logger.info("[ocr] Done: %d chars from %d pages", len(result), len(images))
        return result

    except Exception as e:
        logger.warning("[ocr] Failed: %s. Tesseract installed?", e)
        return ""


def _extract_pdf(data: bytes) -> str:
    # Write bytes to a temp file so pdf2image can use it when OCR is needed
    import tempfile, os

    tmp_path: Optional[str] = None
    try:
        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
            tmp.write(data)
            tmp_path = tmp.name

        # Step 1: try pdfplumber (fast, works for text PDFs)
        try:
            import pdfplumber
            with pdfplumber.open(io.BytesIO(data)) as pdf:
                pages = []
                for page in pdf.pages:
                    text = page.extract_text()
                    if text:
                        pages.append(text)
                result = "\n\n".join(pages)
        except Exception as exc:
            logger.warning(f"pdfplumber extraction failed: {exc}")
            result = ""

        # Step 2: OCR fallback when pdfplumber finds too little text
        if _is_scanned_pdf(result):
            logger.info("[pipeline] PDF scan detected, running OCR...")
            result = _ocr_pdf(tmp_path)
            if not result.strip():
                logger.warning("[pipeline] OCR produced no text — PDF may be corrupt or unsupported")

        return result

    finally:
        if tmp_path:
            try:
                os.unlink(tmp_path)
            except OSError:
                pass


def _extract_docx(data: bytes) -> str:
    try:
        from docx import Document
        doc = Document(io.BytesIO(data))
        paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
        return "\n".join(paragraphs)
    except Exception as exc:
        logger.warning(f"python-docx extraction failed: {exc}")
        return ""


def _ocr_image_bytes(data: bytes) -> str:
    try:
        import sys
        import pytesseract
        from PIL import Image

        if sys.platform == "win32":
            pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

        img = Image.open(io.BytesIO(data))
        try:
            result = pytesseract.image_to_string(img, lang="vie")
        except Exception:
            result = pytesseract.image_to_string(img, lang="eng")
        logger.info("[ocr_image] extracted %d chars", len(result))
        return result
    except Exception as exc:
        logger.warning("[ocr_image] failed: %s", exc)
        return ""


def _extract_text(data: bytes, file_type: Optional[str]) -> str:
    mime = (file_type or "").lower()
    if "pdf" in mime:
        return _extract_pdf(data)
    if "word" in mime or "docx" in mime or "openxmlformats" in mime:
        return _extract_docx(data)
    if mime.startswith("image/"):
        return _ocr_image_bytes(data)
    # Plain text fallback
    try:
        return data.decode("utf-8", errors="replace")
    except Exception:
        return ""


def _read_minio(file_path: str) -> bytes:
    from app.core.storage import get_storage_client, download_file_data
    client = get_storage_client()
    return download_file_data(client, REF_DOCS_BUCKET, file_path)


# ── Main pipeline ────────────────────────────────────────────────────────────

async def process_document_embedding(doc_id: str) -> None:
    """
    Background task — safe to call after the upload response has been sent.
    Creates a fresh DB session internally.
    """
    from app.core.database import AsyncSessionLocal
    from app.models.reference_document import ReferenceDocument
    from app.services.chunking_service import chunk_document
    from app.services import embedding_service
    from sqlalchemy import select

    logger.info(f"[pipeline] start  doc_id={doc_id}")

    if not embedding_service.is_available():
        logger.error("[pipeline] embedding model not loaded — skipping")
        return

    async with AsyncSessionLocal() as db:
        try:
            # step 1: fetch + download + extract text
            logger.info(f"[pipeline] step 1: fetch doc {doc_id}")
            result = await db.execute(
                select(ReferenceDocument).where(ReferenceDocument.id == doc_id)
            )
            doc = result.scalar_one_or_none()
            if not doc:
                logger.warning(f"[pipeline] doc {doc_id} not found in DB")
                return
            if not doc.file_path:
                logger.warning(f"[pipeline] doc {doc_id} has no file_path — skipping")
                return

            logger.info(f"[pipeline] step 1: downloading  {doc.file_path}")
            file_data = await asyncio.to_thread(_read_minio, doc.file_path)
            logger.info(f"[pipeline] step 1: downloaded  {len(file_data)} bytes")

            logger.info(f"[pipeline] step 1: extracting text  doc {doc_id}")
            text = await asyncio.to_thread(_extract_text, file_data, doc.file_type)
            if not text.strip():
                logger.warning(f"[pipeline] doc {doc_id} — no text extracted, embedding skipped")
                return
            logger.info(f"[pipeline] step 1: extracted  {len(text)} chars")

            # step 2: LLM metadata extraction (optional — skipped if LLM not configured)
            logger.info(f"[pipeline] step 2: LLM metadata {doc_id}")
            try:
                from app.services.metadata_extraction_service import (
                    extract_metadata, save_metadata_preview,
                )
                from app.services.llm_service import llm_service
                from app.core.redis import get_redis

                if llm_service._base_url:
                    meta = await extract_metadata(text, doc_id, llm_service)
                    redis = await get_redis()
                    await save_metadata_preview(doc_id, meta, redis)
                else:
                    logger.warning(
                        "[pipeline] step 2: LLM_BASE_URL rỗng, "
                        "bỏ qua metadata extraction doc %s — "
                        "set LLM_BASE_URL trong .env rồi restart server",
                        doc_id,
                    )
            except Exception as e:
                logger.error(
                    "[pipeline] step 2: LLM metadata lỗi doc %s: %s",
                    doc_id, e, exc_info=True,
                )

            # step 3: chunk
            logger.info(f"[pipeline] step 3: chunk doc {doc_id}")
            metadata = {
                "so_ki_hieu": doc.so_ki_hieu,
                "co_quan_ban_hanh": doc.co_quan_ban_hanh,
            }
            chunks = chunk_document(text, metadata)
            if not chunks:
                logger.warning(f"[pipeline] doc {doc_id} — chunking produced 0 chunks")
                return
            logger.info(f"[pipeline] step 3: {len(chunks)} chunks created")

            # step 4: embed
            logger.info(f"[pipeline] step 4: embed doc {doc_id}")
            chunk_texts = [c["content"] for c in chunks]
            total = len(chunk_texts)

            def _embed_all():
                results = []
                batch_size = 8
                for i in range(0, total, batch_size):
                    batch = chunk_texts[i : i + batch_size]
                    logger.info(
                        f"[pipeline] embedding doc {doc_id}: "
                        f"chunk {i+1}-{min(i+batch_size, total)}/{total}"
                    )
                    results.extend(embedding_service.embed_batch(batch))
                return results

            embeddings = await asyncio.to_thread(_embed_all)

            # 6. Delete old chunks for this doc (idempotent re-run)
            from app.models.reference_doc_chunk import ReferenceDocChunk
            from sqlalchemy import delete as sa_delete
            await db.execute(
                sa_delete(ReferenceDocChunk).where(ReferenceDocChunk.document_id == doc_id)
            )

            # 7. Bulk-insert new chunk rows
            import uuid as _uuid
            chunk_rows = [
                ReferenceDocChunk(
                    id=str(_uuid.uuid4()),
                    document_id=doc_id,
                    chunk_index=c["chunk_index"],
                    content=c["content"],
                    dieu_khoan=c.get("dieu_khoan"),
                    token_count=c.get("token_count", 0),
                    embedding=embeddings[i],
                )
                for i, c in enumerate(chunks)
            ]
            db.add_all(chunk_rows)

            # 8. Keep first chunk's embedding on the document row (doc-level search)
            doc.embedding = embeddings[0]

            await db.flush()
            await db.commit()
            logger.info(f"[pipeline] saved {total} chunks for doc {doc_id}  dim={len(embeddings[0])}")

        except Exception as exc:
            await db.rollback()
            logger.exception(f"[pipeline] doc {doc_id} failed: {exc}")
