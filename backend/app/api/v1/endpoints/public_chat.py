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
from app.services.rag_service import rag_service

_PUBLIC_CHAT_SYSTEM_PROMPT = """Bạn là trợ lý hành chính thông minh của Ủy ban nhân dân phường, hỗ trợ công dân tra cứu thủ tục hành chính 24/7.

NGUYÊN TẮC TRẢ LỜI:
1. Ngắn gọn, súc tích, dễ hiểu với người dân bình thường
2. Luôn trả lời bằng tiếng Việt
3. Chỉ trả lời dựa trên thông tin từ kho văn bản được cung cấp, không bịa đặt
4. Nếu không có thông tin thì nói rõ và hướng dẫn liên hệ trực tiếp UBND phường

CẤU TRÚC TRẢ LỜI KHI HỎI VỀ THỦ TỤC HÀNH CHÍNH:
Trả lời theo đúng cấu trúc sau (nếu có đủ thông tin):

[Tên thủ tục]

**HỒ SƠ CẦN NỘP:**
- [Giấy tờ 1]
- [Giấy tờ 2]
- ...

**TRÌNH TỰ THỰC HIỆN:**
1. [Bước 1]
2. [Bước 2]
- ...

**THỜI GIAN GIẢI QUYẾT:** [X ngày làm việc]
**NƠI NỘP HỒ SƠ:** [Địa điểm cụ thể]
**LỆ PHÍ:** [Miễn phí / Số tiền cụ thể]

**LƯU Ý QUAN TRỌNG** (nếu có):
- [Lưu ý 1]
- [Lưu ý 2]

CẤU TRÚC TRẢ LỜI KHI HỎI CÂU HỎI THÔNG THƯỜNG:
Trả lời ngắn gọn 2-3 câu, không cần cấu trúc phức tạp.

VÍ DỤ CÂU HỎI VÀ CÁCH TRẢ LỜI:

Câu hỏi: "Đăng ký khai sinh cần những gì?"
Trả lời:
Đăng ký khai sinh tại UBND phường cần chuẩn bị:

**HỒ SƠ CẦN NỘP:**
- Tờ khai đăng ký khai sinh (lấy mẫu tại UBND phường)
- Giấy chứng sinh do bệnh viện cấp (bản gốc)
- Chứng minh nhân dân/CCCD của cha và mẹ (bản sao)
- Sổ hộ khẩu hoặc giấy tờ cư trú (bản sao)
- Giấy đăng ký kết hôn của cha mẹ (nếu có, bản sao)

**TRÌNH TỰ THỰC HIỆN:**
1. Chuẩn bị đầy đủ hồ sơ theo danh sách trên
2. Nộp hồ sơ tại bộ phận một cửa UBND phường
3. Nhận giấy hẹn trả kết quả
4. Nhận Giấy khai sinh theo ngày hẹn

**THỜI GIAN GIẢI QUYẾT:** 3 ngày làm việc
**NƠI NỘP HỒ SƠ:** Bộ phận tiếp nhận và trả kết quả UBND phường (trong giờ hành chính)
**LỆ PHÍ:** Miễn phí

**LƯU Ý QUAN TRỌNG:**
- Đăng ký trong vòng 60 ngày kể từ ngày sinh
- Nếu quá hạn cần làm thêm cam kết của 2 người làm chứng"""

router = APIRouter()
logger = logging.getLogger(__name__)

_RATE_LIMIT = 20
_RATE_WINDOW = 3600  # 1 hour


def _friendly_error(raw: str) -> str:
    r = raw.lower()
    if "429" in raw or "too many requests" in r or "rate limit" in r:
        return "Hệ thống đang xử lý quá nhiều yêu cầu. Vui lòng chờ vài giây rồi thử lại."
    if "401" in raw or "unauthorized" in r or "api key" in r:
        return "Dịch vụ AI tạm thời không khả dụng. Vui lòng thử lại sau."
    if "503" in raw or "502" in raw or "service unavailable" in r:
        return "Dịch vụ AI đang bảo trì. Vui lòng thử lại sau ít phút."
    if "timeout" in r or "timed out" in r or "524" in raw:
        return "Yêu cầu mất quá nhiều thời gian xử lý. Vui lòng thử lại."
    if "connection" in r or "network" in r:
        return "Lỗi kết nối mạng. Vui lòng kiểm tra kết nối và thử lại."
    return "Có lỗi xảy ra. Vui lòng thử lại sau."


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
                {"role": "system", "content": _PUBLIC_CHAT_SYSTEM_PROMPT}
            ]
            if context:
                messages.append({
                    "role": "system",
                    "content": f"Nguồn tham chiếu:\n{context}",
                })
            messages.extend(history)
            messages.append({"role": "user", "content": body.query})

            # 4. Stream tokens (with fallback when LLM unavailable)
            llm_error: str | None = None

            if not llm_service._base_url:
                llm_error = "LLM chưa được cấu hình"
            else:
                async for token in llm_service.chat_stream(messages, temperature=0.05):
                    if token.startswith("[ERROR") or token == "[LLM_OFFLINE]":
                        llm_error = token
                        break
                    full_answer += token
                    payload = json.dumps({"type": "token", "content": token}, ensure_ascii=False)
                    yield f"data: {payload}\n\n"

            # Fallback: khi LLM lỗi và chưa có câu trả lời → dùng chunks
            if llm_error and not full_answer.strip():
                if chunks_used:
                    fallback_parts = []
                    for i, chunk in enumerate(chunks_used[:3]):
                        title = (
                            chunk.get("so_ki_hieu")
                            or chunk.get("document_title")
                            or f"Nguồn {i + 1}"
                        )
                        content = chunk.get("content", "").strip()
                        if content:
                            fallback_parts.append(f"Theo {title}:\n{content[:400]}")

                    if fallback_parts:
                        fallback_text = (
                            "*(Chế độ tra cứu nhanh — AI đang bận, "
                            "hiển thị thông tin từ kho văn bản)*\n\n"
                            + "\n\n---\n\n".join(fallback_parts)
                        )
                    else:
                        fallback_text = "Không tìm thấy thông tin liên quan trong kho văn bản."

                    full_answer = fallback_text
                    chunk_size = 50
                    for i in range(0, len(fallback_text), chunk_size):
                        piece = fallback_text[i : i + chunk_size]
                        payload = json.dumps(
                            {"type": "token", "content": piece}, ensure_ascii=False
                        )
                        yield f"data: {payload}\n\n"
                else:
                    payload = json.dumps(
                        {"type": "error", "content": _friendly_error(llm_error)},
                        ensure_ascii=False,
                    )
                    yield f"data: {payload}\n\n"
                    return

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
            payload = json.dumps(
                {"type": "error", "content": _friendly_error(str(exc))},
                ensure_ascii=False,
            )
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
