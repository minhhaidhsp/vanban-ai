"""
Background pipeline for batch-uploaded reference documents.

Flow:
  0. Set Redis ref_job:{job_id} = "processing"
  1. Extract text from file bytes (PDF / DOCX / plain-text)
  2. LLM metadata extraction (Vietnamese admin doc prompt)
  3. UPDATE reference_documents with extracted fields
  4. Chunk + embed (mirrors pipeline_service.py logic)
  5. Set Redis ref_job:{job_id} = "done" / "failed"
"""
import asyncio
import json
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

_LLM_SYSTEM_PROMPT = (
    "Bạn là chuyên gia phân tích văn bản hành chính Việt Nam. "
    "Trích xuất thông tin từ văn bản sau và trả về JSON (không giải thích thêm):\n"
    '{"so_ky_hieu":"...hoặc null",'
    '"trich_yeu":"...tóm tắt ngắn gọn nội dung chính",'
    '"loai_van_ban":"Quyết định|Công văn|Báo cáo|Hướng dẫn|Nghị định|Thông tư|Khác",'
    '"co_quan_ban_hanh":"...hoặc null",'
    '"ngay_ban_hanh":"DD/MM/YYYY hoặc null"}'
)


def _extract_text(data: bytes, file_type: str | None) -> str:
    from app.services.pipeline_service import _extract_text as _et
    return _et(data, file_type)


def _parse_date(s: str | None):
    if not s or str(s).lower() in ("null", "none", ""):
        return None
    for fmt in ("%d/%m/%Y", "%Y-%m-%d", "%d-%m-%Y"):
        try:
            return datetime.strptime(s.strip(), fmt).date()
        except (ValueError, AttributeError):
            continue
    return None


async def _extract_metadata_llm(text: str) -> dict:
    """Call LLM with custom prompt. Returns parsed dict (empty if unavailable)."""
    try:
        from app.services.llm_service import llm_service
        if not llm_service._base_url:
            return {}
        snippet = text[:4000]
        raw = await llm_service.chat(
            messages=[
                {"role": "system", "content": _LLM_SYSTEM_PROMPT},
                {"role": "user", "content": snippet},
            ],
            temperature=0.0,
            max_tokens=512,
            json_mode=True,
        )
        return json.loads(raw)
    except Exception as exc:
        logger.warning("[ref_pipeline] LLM metadata skipped: %s", exc)
        return {}


async def process_reference_background(
    job_id: str,
    doc_id: str,
    file_data: bytes,
    filename: str,
    file_type: str,
    owner_id: str,
) -> None:
    """
    Runs as a FastAPI BackgroundTask after upload-batch returns 202.
    Creates its own DB session and Redis — never reuses the request session.
    """
    from app.core.database import AsyncSessionLocal
    from app.core.redis import get_redis
    from app.core.config import get_settings
    from app.models.reference_document import ReferenceDocument
    from app.services import embedding_service
    from app.services.chunking_service import chunk_document
    from sqlalchemy import select

    settings = get_settings()
    redis = await get_redis()

    async def _set_status(status_str: str, error: str | None = None) -> None:
        payload = {"status": status_str, "filename": filename, "doc_id": doc_id}
        if error:
            payload["error"] = error
        await redis.set(
            f"ref_job:{job_id}",
            json.dumps(payload),
            ex=settings.doc_job_ttl_seconds,
        )

    try:
        # Step 0
        await _set_status("processing")
        logger.info("[ref_pipeline] start job=%s doc=%s file=%s", job_id, doc_id, filename)

        # Step 1 — extract text
        text = await asyncio.to_thread(_extract_text, file_data, file_type)
        if not text.strip():
            logger.warning("[ref_pipeline] no text from %s", filename)
            await _set_status("done")
            return

        logger.info("[ref_pipeline] extracted %d chars from %s", len(text), filename)

        # Step 2 — LLM metadata
        meta = await _extract_metadata_llm(text)
        logger.info("[ref_pipeline] LLM meta: %s", list(meta.keys()))

        # Step 3 — update DB record
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(ReferenceDocument).where(ReferenceDocument.id == doc_id)
            )
            doc = result.scalar_one_or_none()
            if not doc:
                logger.warning("[ref_pipeline] doc %s not found in DB", doc_id)
                await _set_status("failed", error="Document not found in DB")
                return

            def _notnull(v: str) -> str:
                return "" if (not v or str(v).lower() in ("null", "none")) else str(v).strip()

            so_ky    = _notnull(meta.get("so_ky_hieu"))
            trich_yeu = _notnull(meta.get("trich_yeu"))
            loai_vb  = _notnull(meta.get("loai_van_ban"))
            co_quan  = _notnull(meta.get("co_quan_ban_hanh"))
            ngay     = _parse_date(meta.get("ngay_ban_hanh"))

            # title = trich_yeu (preferred) or so_ky or keep original filename
            best_title = trich_yeu or so_ky or filename
            doc.title = best_title

            if so_ky:
                doc.so_ki_hieu = so_ky
            if trich_yeu:
                doc.trich_yeu = trich_yeu
            if loai_vb:
                doc.loai_van_ban = loai_vb
            if co_quan:
                doc.co_quan_ban_hanh = co_quan
            if ngay:
                doc.ngay_ban_hanh = ngay

            # Step 4 — chunk + embed
            if embedding_service.is_available():
                metadata = {
                    "so_ki_hieu": doc.so_ki_hieu,
                    "co_quan_ban_hanh": doc.co_quan_ban_hanh,
                }
                chunks = chunk_document(text, metadata)
                chunk_texts = [c["content"] for c in chunks]
                total = len(chunk_texts)
                logger.info("[ref_pipeline] %d chunks to embed for %s", total, filename)

                def _embed_all() -> list:
                    results = []
                    batch_size = 8
                    for i in range(0, total, batch_size):
                        results.extend(embedding_service.embed_batch(chunk_texts[i: i + batch_size]))
                    return results

                embeddings = await asyncio.to_thread(_embed_all)

                from app.models.reference_doc_chunk import ReferenceDocChunk
                from sqlalchemy import delete as sa_delete
                import uuid as _uuid

                await db.execute(
                    sa_delete(ReferenceDocChunk).where(ReferenceDocChunk.document_id == doc_id)
                )
                db.add_all([
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
                ])
                doc.embedding = embeddings[0] if embeddings else None
                logger.info("[ref_pipeline] embedded %d chunks", total)
            else:
                logger.warning("[ref_pipeline] embedding unavailable — skipping for %s", filename)

            await db.commit()

        # Step 5 — done
        await _set_status("done")
        logger.info("[ref_pipeline] done job=%s", job_id)

    except Exception as exc:
        logger.exception("[ref_pipeline] failed job=%s: %s", job_id, exc)
        await _set_status("failed", error=str(exc))
