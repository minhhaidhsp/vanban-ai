"""
Background pipeline for user-uploaded documents (documents table).

Flow:
  1. Set Redis job status = "processing"
  2. Extract text from file bytes (PDF / DOCX / plain-text)
  3. LLM metadata extraction (optional — skipped if LLM not configured)
  4. Embed extracted text in batches of 8
  5. Store extracted text in document.content, save embedding
  6. Set Redis job status = "done"
  On any exception: set status = "failed" with error message
"""
import asyncio
import json
import logging

logger = logging.getLogger(__name__)


# ── Reuse text extractors from pipeline_service ──────────────────────────────

def _extract_text(data: bytes, file_type: str | None) -> str:
    from app.services.pipeline_service import _extract_text as _et
    return _et(data, file_type)


# ── Main background task ──────────────────────────────────────────────────────

async def process_document_background(
    job_id: str,
    doc_id: str,
    file_data: bytes,
    filename: str,
    file_type: str,
    owner_id: str,
) -> None:
    """
    Runs as a FastAPI BackgroundTask after upload-batch returns 202.
    Creates its own DB session and Redis connection — never reuses the request session.
    """
    from app.core.database import AsyncSessionLocal
    from app.core.redis import get_redis
    from app.core.config import get_settings
    from app.models.document import Document
    from app.services import embedding_service
    from app.services.chunking_service import chunk_document
    from sqlalchemy import select

    settings = get_settings()
    redis = await get_redis()

    async def _set_status(status: str, error: str | None = None) -> None:
        payload: dict = {"status": status, "filename": filename, "doc_id": doc_id}
        if error:
            payload["error"] = error
        await redis.set(
            f"doc_job:{job_id}",
            json.dumps(payload),
            ex=settings.doc_job_ttl_seconds,
        )

    try:
        # Step 1 — mark processing
        await _set_status("processing")
        logger.info("[doc_pipeline] start job=%s doc=%s file=%s", job_id, doc_id, filename)

        # Step 2 — extract text
        text = await asyncio.to_thread(_extract_text, file_data, file_type)
        if not text.strip():
            logger.warning("[doc_pipeline] no text extracted from %s", filename)
            # Still mark done — file is stored, just not embeddable
            await _set_status("done")
            return

        logger.info("[doc_pipeline] extracted %d chars from %s", len(text), filename)

        # Step 3 — LLM metadata (optional)
        summary: str = ""
        try:
            from app.services.llm_service import llm_service
            if llm_service._base_url:
                from app.services.metadata_extraction_service import extract_metadata
                from app.core.redis import get_redis as _get_redis
                meta = await extract_metadata(text, doc_id, llm_service)
                summary = meta.get("trich_yeu") or meta.get("tom_tat") or ""
                _redis = await _get_redis()
                # Cache preview so the editor can optionally use it
                await _redis.set(
                    f"doc_meta_preview:{doc_id}",
                    json.dumps(meta),
                    ex=settings.doc_job_ttl_seconds,
                )
                logger.info("[doc_pipeline] LLM metadata done doc=%s", doc_id)
        except Exception as exc:
            logger.warning("[doc_pipeline] LLM metadata skipped: %s", exc)

        # Step 4 — chunk + embed
        embedding: list[float] | None = None
        if embedding_service.is_available():
            chunks = chunk_document(text, {"filename": filename})
            chunk_texts = [c["content"] for c in chunks]
            total = len(chunk_texts)
            logger.info("[doc_pipeline] %d chunks to embed for %s", total, filename)

            def _embed_all() -> list:
                results = []
                batch_size = 8
                for i in range(0, total, batch_size):
                    batch = chunk_texts[i: i + batch_size]
                    results.extend(embedding_service.embed_batch(batch))
                return results

            embeddings = await asyncio.to_thread(_embed_all)
            embedding = embeddings[0] if embeddings else None
            logger.info("[doc_pipeline] embedded %d chunks dim=%s", total,
                        len(embedding) if embedding else "n/a")
        else:
            logger.warning("[doc_pipeline] embedding model not loaded — skipping embed for %s", filename)

        # Step 5 — persist: update content + embedding
        async with AsyncSessionLocal() as db:
            result = await db.execute(select(Document).where(Document.id == doc_id))
            doc = result.scalar_one_or_none()
            if doc:
                doc.content = json.dumps({
                    "version": "uploaded",
                    "filename": filename,
                    "extractedText": text[:50_000],   # cap at 50 k chars
                    "summary": summary,
                }, ensure_ascii=False)
                if embedding:
                    doc.embedding = embedding
                await db.commit()
                logger.info("[doc_pipeline] doc %s updated in DB", doc_id)

        # Step 6 — done
        await _set_status("done")
        logger.info("[doc_pipeline] done job=%s", job_id)

    except Exception as exc:
        logger.exception("[doc_pipeline] failed job=%s: %s", job_id, exc)
        await _set_status("failed", error=str(exc))
