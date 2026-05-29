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
from app.core.redis import get_redis
from app.models.user import User
from app.services.chat_history_service import get_history, save_turn, clear_history
from app.services.llm_service import llm_service
from app.services.rag_service import rag_service, _SYSTEM_PROMPT

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
    citation_score: float = 0.0
    semantic_score: float = 0.0
    has_disclaimer: bool = False
    llm_available: bool
    fallback_mode: bool = False
    latency_ms: int = 0


class ChatStreamRequest(BaseModel):
    query: str
    doc_id: str = "general"
    doc_context: str | None = None
    top_k: int = 10
    min_score: float = 0.35
    source_ids: list[str] = []  # if non-empty, RAG restricted to these reference_doc ids


class ChatHistoryItem(BaseModel):
    role: str
    content: str


class ChatHistoryResponse(BaseModel):
    doc_id: str
    history: list[ChatHistoryItem]
    total_turns: int


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
    start = time.monotonic()
    result = await rag_service.query(body.query, db, body.top_k, body.min_score)
    latency_ms = int((time.monotonic() - start) * 1000)

    logger.info(
        "[rag] /query latency=%dms  confidence=%.2f  citations=%d  fallback=%s",
        latency_ms, result["confidence"], len(result["citations"]),
        result.get("fallback_mode", False),
    )

    return RAGQueryResponse(
        query=result["query"],
        answer=result["answer"],
        citations=result["citations"],
        chunks_used=[ChunkUsed(**c) for c in result["chunks_used"]],
        confidence=result["confidence"],
        citation_score=result.get("citation_score", 0.0),
        semantic_score=result.get("semantic_score", 0.0),
        has_disclaimer=result.get("has_disclaimer", False),
        llm_available=result.get("llm_available", True),
        fallback_mode=result.get("fallback_mode", False),
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


# ── Chat stream (true SSE token-by-token with history) ────────────────────────

@router.post("/chat/stream")
async def chat_stream(
    body: ChatStreamRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    redis=Depends(get_redis),
):
    """
    SSE streaming chat với RAG context + chat history.
    Yields: token → citations → [DONE]
    Headers cho Cloudflare Tunnel: X-Accel-Buffering: no
    """
    async def _generate():
        full_answer = ""
        chunks_used: list[dict] = []

        try:
            # 1. Retrieve + rerank (scoped to source_ids if provided)
            src = body.source_ids or None
            chunks = await rag_service.retrieve(
                body.query, db, body.top_k, body.min_score, source_ids=src
            )
            if not chunks:
                chunks = await rag_service.retrieve(
                    body.query, db, body.top_k, min_score=0.2, source_ids=src
                )

            if chunks:
                reranked = rag_service.rerank(body.query, chunks)
                chunks_used = reranked
                context = rag_service.build_context(reranked)
            else:
                context = ""

            # 2. Load chat history (last 5 turns)
            history = await get_history(
                str(current_user.id), body.doc_id, redis
            )

            # 3. Build messages with system prompt + optional doc context + history
            messages: list[dict] = [
                {"role": "system", "content": _SYSTEM_PROMPT}
            ]

            if body.doc_context:
                messages.append({
                    "role": "system",
                    "content": "Văn bản đang soạn thảo:\n" + body.doc_context[:1000],
                })

            if context:
                messages.append({
                    "role": "system",
                    "content": f"Nguồn tham chiếu:\n{context}",
                })

            messages.extend(history)
            messages.append({"role": "user", "content": body.query})

            # 4. Stream tokens
            if not llm_service._base_url:
                yield 'data: {"type":"error","content":"LLM chưa được cấu hình"}\n\n'
                return

            async for token in llm_service.chat_stream(messages, temperature=0.05):
                if token.startswith("[ERROR"):
                    payload = json.dumps({"type": "error", "content": token}, ensure_ascii=False)
                    yield f"data: {payload}\n\n"
                    return
                if token == "[LLM_OFFLINE]":
                    yield 'data: {"type":"error","content":"LLM offline"}\n\n'
                    return
                full_answer += token
                payload = json.dumps({"type": "token", "content": token}, ensure_ascii=False)
                yield f"data: {payload}\n\n"

            # 5. Send citations summary after stream ends
            citations_payload = [
                {
                    "document_title": c.get("document_title"),
                    "so_ki_hieu": c.get("so_ki_hieu"),
                    "dieu_khoan": c.get("dieu_khoan"),
                    "score": float(c.get("score") or 0),
                    "content_preview": c.get("content", "")[:200],
                }
                for c in chunks_used[:5]
            ]
            yield f"data: {json.dumps({'type': 'citations', 'data': citations_payload}, ensure_ascii=False)}\n\n"

            # 6. Persist turn to history
            if full_answer:
                await save_turn(
                    str(current_user.id),
                    body.doc_id,
                    body.query,
                    full_answer,
                    redis,
                )

            yield "data: [DONE]\n\n"

        except Exception as exc:
            logger.error("[rag] chat_stream error: %s", exc, exc_info=True)
            payload = json.dumps({"type": "error", "content": str(exc)}, ensure_ascii=False)
            yield f"data: {payload}\n\n"

    return StreamingResponse(
        _generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


# ── Chat history ──────────────────────────────────────────────────────────────

@router.get("/chat/history", response_model=ChatHistoryResponse)
async def get_chat_history(
    doc_id: str = "general",
    current_user: User = Depends(get_current_user),
    redis=Depends(get_redis),
):
    history = await get_history(str(current_user.id), doc_id, redis)
    return ChatHistoryResponse(
        doc_id=doc_id,
        history=[ChatHistoryItem(role=m["role"], content=m["content"]) for m in history],
        total_turns=len(history) // 2,
    )


@router.delete("/chat/history")
async def delete_chat_history(
    doc_id: str = "general",
    current_user: User = Depends(get_current_user),
    redis=Depends(get_redis),
):
    await clear_history(str(current_user.id), doc_id, redis)
    return {"status": "cleared", "doc_id": doc_id}
