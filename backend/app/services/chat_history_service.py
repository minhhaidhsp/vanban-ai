"""
Chat history service — lưu và đọc lịch sử hội thoại RAG qua Redis.

Key pattern: chat_history:{user_id}:{doc_id}
TTL: 24 giờ
Mỗi turn = 2 messages (user + assistant), tối đa MAX_HISTORY_TURNS turns.
"""
import json
import logging

logger = logging.getLogger(__name__)

MAX_HISTORY_TURNS = 20
HISTORY_TTL = 86400  # 24 giờ


def _history_key(user_id: str, doc_id: str) -> str:
    return f"chat_history:{user_id}:{doc_id}"


async def get_history(
    user_id: str,
    doc_id: str,
    redis_client,
    last_n: int = 5,
) -> list[dict]:
    """Lấy last_n turns gần nhất (mỗi turn = 2 messages: user + assistant)."""
    key = _history_key(user_id, doc_id)
    try:
        data = await redis_client.get(key)
        if not data:
            return []
        history: list[dict] = json.loads(data)
        return history[-(last_n * 2):]
    except Exception as exc:
        logger.warning("[history] get_history error: %s", exc)
        return []


async def save_turn(
    user_id: str,
    doc_id: str,
    user_message: str,
    assistant_message: str,
    redis_client,
) -> None:
    """Lưu 1 turn (user + assistant) vào history, giới hạn MAX_HISTORY_TURNS."""
    key = _history_key(user_id, doc_id)
    try:
        data = await redis_client.get(key)
        history: list[dict] = json.loads(data) if data else []

        history.append({"role": "user", "content": user_message})
        history.append({"role": "assistant", "content": assistant_message})

        if len(history) > MAX_HISTORY_TURNS * 2:
            history = history[-(MAX_HISTORY_TURNS * 2):]

        await redis_client.setex(
            key,
            HISTORY_TTL,
            json.dumps(history, ensure_ascii=False),
        )
    except Exception as exc:
        logger.warning("[history] save_turn error: %s", exc)


async def clear_history(
    user_id: str,
    doc_id: str,
    redis_client,
) -> None:
    """Xóa toàn bộ history cho một doc_id."""
    key = _history_key(user_id, doc_id)
    try:
        await redis_client.delete(key)
    except Exception as exc:
        logger.warning("[history] clear_history error: %s", exc)
