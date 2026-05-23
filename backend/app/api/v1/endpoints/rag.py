import asyncio
import json
import logging
import time

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import func as sql_func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.services.llm_service import llm_service
from app.services.rag_service import rag_service

router = APIRouter()
logger = logging.getLogger(__name__)


# ── Schemas ───────────────────────────────────────────────────────────────────

class RAGQueryRequest(BaseModel):
    query: str
    top_k: int = 10
    min_score: float = 0.35
    stream: bool = False


class ChunkUsed(BaseModel):
    document_title: str | None
    so_ki_hieu: str | None
    dieu_khoan: str | None
    score: float
    rerank_score: float | None
    content_preview: str


class RAGQueryResponse(BaseModel):
    query: str
    answer: str
    citations: list[str]
    chunks_used: list[ChunkUsed]
    confidence: float
    llm_available: bool
    latency_ms: int = 0


# ── Health ────────────────────────────────────────────────────────────────────

@router.get("/health")
async def rag_health(db: AsyncSession = Depends(get_db)):
    from app.models.reference_doc_chunk import ReferenceDocChunk
    from app.models.reference_document import ReferenceDocument

    total_chunks = await db.scalar(
        select(sql_func.count()).select_from(ReferenceDocChunk)
    ) or 0
    total_docs = await db.scalar(
        select(sql_func.count()).select_from(ReferenceDocument)
    ) or 0

    llm_status = "not_configured"
    if llm_service._base_url:
        health = await llm_service.health_check()
        llm_status = health.get("status", "error")

    return {
        "retrieval": "ok",
        "llm": llm_status,
        "total_chunks": total_chunks,
        "total_documents": total_docs,
    }


# ── Query (non-streaming) ─────────────────────────────────────────────────────

@router.post("/query", response_model=RAGQueryResponse)
async def rag_query(
    body: RAGQueryRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not llm_service._base_url:
        return RAGQueryResponse(
            query=body.query,
            answer="LLM chưa được cấu hình. Vui lòng cập nhật URL Colab.",
            citations=[],
            chunks_used=[],
            confidence=0.0,
            llm_available=False,
        )

    start = time.monotonic()
    result = await rag_service.query(body.query, db, body.top_k, body.min_score)
    latency_ms = int((time.monotonic() - start) * 1000)

    logger.info("[rag] /query latency=%dms  confidence=%.2f  citations=%d",
                latency_ms, result["confidence"], len(result["citations"]))

    return RAGQueryResponse(
        query=result["query"],
        answer=result["answer"],
        citations=result["citations"],
        chunks_used=[ChunkUsed(**c) for c in result["chunks_used"]],
        confidence=result["confidence"],
        llm_available=True,
        latency_ms=latency_ms,
    )


# ── Query (SSE streaming) ─────────────────────────────────────────────────────

@router.post("/query/stream")
async def rag_query_stream(
    body: RAGQueryRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    SSE streaming endpoint. Hiện tại dùng fallback non-stream:
    lấy full answer từ rag_service.query() rồi stream theo từng chunk nhỏ.
    True token-streaming cần thêm stream=True vào llm_service.chat().
    """
    async def _event_stream():
        try:
            result = await rag_service.query(body.query, db, body.top_k, body.min_score)
            answer: str = result["answer"]

            # Stream answer theo từng đoạn ~40 ký tự (giả lập token streaming)
            chunk_size = 40
            for i in range(0, len(answer), chunk_size):
                piece = answer[i: i + chunk_size]
                yield f"data: {json.dumps({'type': 'chunk', 'content': piece}, ensure_ascii=False)}\n\n"
                await asyncio.sleep(0.02)

            yield f"data: {json.dumps({'type': 'citations', 'citations': result['citations']}, ensure_ascii=False)}\n\n"

            chunks_payload = [
                {
                    "document_title": c.get("document_title"),
                    "so_ki_hieu": c.get("so_ki_hieu"),
                    "dieu_khoan": c.get("dieu_khoan"),
                    "score": float(c.get("score") or 0),
                    "rerank_score": c.get("rerank_score"),
                    "content_preview": c.get("content_preview", ""),
                }
                for c in result["chunks_used"]
            ]
            yield f"data: {json.dumps({'type': 'chunks_used', 'chunks': chunks_payload}, ensure_ascii=False)}\n\n"
            yield f"data: {json.dumps({'type': 'done'}, ensure_ascii=False)}\n\n"

        except Exception as exc:
            logger.error("[rag] stream error: %s", exc, exc_info=True)
            yield f"data: {json.dumps({'type': 'error', 'message': str(exc)}, ensure_ascii=False)}\n\n"

    return StreamingResponse(
        _event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
