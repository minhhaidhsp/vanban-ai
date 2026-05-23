"""
Metadata extraction service — LLM-powered.

Extracts structured metadata from Vietnamese administrative document text
using the configured LLM (Qwen/Qwen2.5-3B-Instruct via vLLM).

Does NOT write to the database — callers decide what to persist.
Redis is used only for preview caching (TTL 1h).
"""
import json
import logging
from typing import Any

logger = logging.getLogger(__name__)

# ── Prompt ────────────────────────────────────────────────────────────────────

_SYSTEM_PROMPT = """\
Bạn là trợ lý trích xuất thông tin văn bản hành chính Việt Nam.
QUAN TRỌNG: Chỉ trích xuất thông tin CÓ TRONG văn bản được cung cấp.
Nếu không tìm thấy thông tin → trả về null, KHÔNG được suy diễn hay bịa đặt.
Trả về JSON hợp lệ, không có text thừa, không có markdown code fence."""

_USER_TEMPLATE = """\
Trích xuất thông tin từ văn bản sau và trả về JSON theo đúng schema.

Schema yêu cầu:
{{
  "so_ki_hieu": "ví dụ 30/2020/NĐ-CP hoặc null",
  "ngay_ban_hanh": "YYYY-MM-DD hoặc null",
  "co_quan_ban_hanh": "tên cơ quan hoặc null",
  "nguoi_ky": "họ tên người ký hoặc null",
  "trich_yeu": "nội dung trích yếu ngắn gọn hoặc null",
  "can_cu": ["căn cứ 1", "căn cứ 2"] hoặc [],
  "hieu_luc": "con_hieu_luc hoặc het_hieu_luc hoặc chua hoặc mot_phan hoặc null",
  "tom_tat": "tóm tắt 3-5 câu hoặc null",
  "confidence": {{
    "so_ki_hieu": "high hoặc medium hoặc low",
    "ngay_ban_hanh": "high hoặc medium hoặc low",
    "co_quan_ban_hanh": "high hoặc medium hoặc low",
    "nguoi_ky": "high hoặc medium hoặc low",
    "trich_yeu": "high hoặc medium hoặc low",
    "can_cu": "high hoặc medium hoặc low",
    "hieu_luc": "high hoặc medium hoặc low",
    "tom_tat": "high hoặc medium hoặc low"
  }}
}}

Văn bản:
{text}"""

# Fields used for counting non-null values in logging
_MAIN_FIELDS = ("so_ki_hieu", "ngay_ban_hanh", "co_quan_ban_hanh",
                "nguoi_ky", "trich_yeu", "can_cu", "hieu_luc", "tom_tat")

_TOTAL_FIELDS = len(_MAIN_FIELDS)


def _empty_result() -> dict[str, Any]:
    return {
        "so_ki_hieu": None,
        "ngay_ban_hanh": None,
        "co_quan_ban_hanh": None,
        "nguoi_ky": None,
        "trich_yeu": None,
        "can_cu": [],
        "hieu_luc": None,
        "tom_tat": None,
        "confidence": {f: "low" for f in _MAIN_FIELDS},
    }


def _count_non_null(meta: dict) -> int:
    count = 0
    for f in _MAIN_FIELDS:
        v = meta.get(f)
        if v is not None and v != [] and v != "":
            count += 1
    return count


async def extract_metadata(
    text: str,
    doc_id: str,
    llm_service: Any,
) -> dict[str, Any]:
    """
    Extract structured metadata from document text using LLM.

    Takes the first 2000 chars (header section usually contains all metadata).
    Retries once on JSON parse failure.
    Returns empty result dict on persistent failure — never raises.
    """
    snippet = text[:2000].strip()
    messages = [
        {"role": "system", "content": _SYSTEM_PROMPT},
        {"role": "user", "content": _USER_TEMPLATE.format(text=snippet)},
    ]

    for attempt in range(1, 3):  # max 2 attempts
        try:
            raw = await llm_service.chat(messages, json_mode=True)
            # Strip accidental markdown fences if model adds them
            raw = raw.strip()
            if raw.startswith("```"):
                raw = raw.split("```")[1]
                if raw.startswith("json"):
                    raw = raw[4:]
                raw = raw.strip()

            meta = json.loads(raw)

            non_null = _count_non_null(meta)
            logger.info(
                "[metadata] extracted doc %s: %d/%d fields populated",
                doc_id, non_null, _TOTAL_FIELDS,
            )
            return meta

        except json.JSONDecodeError as exc:
            if attempt == 1:
                logger.warning(
                    "[metadata] JSON parse failed doc %s (attempt %d): %s — retrying",
                    doc_id, attempt, exc,
                )
            else:
                logger.warning(
                    "[metadata] JSON parse failed doc %s (attempt %d): %s — returning empty",
                    doc_id, attempt, exc,
                )
        except Exception as exc:
            logger.warning(
                "[metadata] LLM call failed doc %s (attempt %d): %s",
                doc_id, attempt, exc,
            )
            break  # non-JSON errors (network, etc.) — don't retry

    return _empty_result()


# ── Redis helpers ─────────────────────────────────────────────────────────────

_REDIS_PREFIX = "metadata_preview"
_REDIS_TTL = 3600  # 1 hour


async def save_metadata_preview(
    doc_id: str,
    metadata: dict[str, Any],
    redis_client: Any,
) -> None:
    """Cache extracted metadata in Redis for 1 hour."""
    key = f"{_REDIS_PREFIX}:{doc_id}"
    await redis_client.set(key, json.dumps(metadata, ensure_ascii=False), ex=_REDIS_TTL)
    logger.info("[metadata] saved preview to Redis doc %s", doc_id)


async def get_metadata_preview(
    doc_id: str,
    redis_client: Any,
) -> dict[str, Any] | None:
    """Retrieve cached metadata from Redis. Returns None if not found."""
    key = f"{_REDIS_PREFIX}:{doc_id}"
    value = await redis_client.get(key)
    if value is None:
        return None
    return json.loads(value)
