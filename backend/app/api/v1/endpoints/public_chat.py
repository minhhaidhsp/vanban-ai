import json
import logging

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.redis import get_redis
from app.services.chat_history_service import get_history, save_turn
from app.services.llm_service import llm_service
from app.services.rag_service import rag_service, _SYSTEM_PROMPT

router = APIRouter()
logger = logging.getLogger(__name__)

_RATE_LIMIT = 20
_RATE_WINDOW = 3600  # 1 hour


class PublicChatRequest(BaseModel):
    query: str
    session_id: str = "anonymous"


@router.post("/chat/stream")
async def public_chat_stream(
    body: PublicChatRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    redis=Depends(get_redis),
):
    """
    Public SSE streaming chat — no auth required.
    Rate-limited: 20 requests/IP/hour via Redis.
    """
    client_ip = (request.client.host if request.client else "unknown")
    rate_key = f"public_chat_rate:{client_ip}"

    new_count = await redis.incr(rate_key)
    if new_count == 1:
        await redis.expire(rate_key, _RATE_WINDOW)
    if new_count > _RATE_LIMIT:
        raise HTTPException(status_code=429, detail="Quá nhiều yêu cầu, vui lòng thử lại sau")

    user_id = "public-user"
    session_id = body.session_id or "anonymous"

    async def _generate():
        full_answer = ""
        chunks_used: list[dict] = []

        try:
            # 1. Retrieve + rerank (stricter thresholds for public)
            chunks = await rag_service.retrieve(
                body.query, db, top_k=5, min_score=0.4
            )
            if not chunks:
                chunks = await rag_service.retrieve(
                    body.query, db, top_k=5, min_score=0.3
                )

            if chunks:
                reranked = rag_service.rerank(body.query, chunks, top_n=3)
                chunks_used = reranked
                context = rag_service.build_context(reranked)
            else:
                context = ""

            # 2. Load session history (last 5 turns)
            history = await get_history(user_id, session_id, redis)

            # 3. Build messages
            messages: list[dict] = [
                {"role": "system", "content": _SYSTEM_PROMPT}
            ]
            if context:
                messages.append({
                    "role": "system",
                    "content": f"Nguồn tham chiếu:\n{context}",
                })
            messages.extend(history)
            messages.append({"role": "user", "content": body.query})

            # 4. Stream tokens
            if not llm_service._base_url:
                yield 'data: {"type":"error","content":"Hệ thống AI tạm thời không khả dụng"}\n\n'
                return

            async for token in llm_service.chat_stream(messages, temperature=0.05):
                if token.startswith("[ERROR") or token == "[LLM_OFFLINE]":
                    payload = json.dumps(
                        {"type": "error", "content": "Lỗi hệ thống, vui lòng thử lại"},
                        ensure_ascii=False,
                    )
                    yield f"data: {payload}\n\n"
                    return
                full_answer += token
                payload = json.dumps({"type": "token", "content": token}, ensure_ascii=False)
                yield f"data: {payload}\n\n"

            # 5. Send citations (compact — only title + so_ki_hieu)
            citations_payload = [
                {
                    "document_title": c.get("document_title"),
                    "so_ki_hieu": c.get("so_ki_hieu"),
                    "score": float(c.get("score") or 0),
                }
                for c in chunks_used[:3]
            ]
            yield f"data: {json.dumps({'type': 'citations', 'data': citations_payload}, ensure_ascii=False)}\n\n"

            # 6. Persist turn to session history
            if full_answer:
                await save_turn(user_id, session_id, body.query, full_answer, redis)

            yield "data: [DONE]\n\n"

        except Exception as exc:
            logger.error("[public_chat] error: %s", exc, exc_info=True)
            payload = json.dumps({"type": "error", "content": "Lỗi hệ thống"}, ensure_ascii=False)
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
