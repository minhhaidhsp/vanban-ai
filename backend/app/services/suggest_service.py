"""
AI Suggest service cho VănBản.AI — Tuần 12.

Gợi ý 3 yếu tố khi tạo văn bản mới:
  - suggest_can_cu()    : RAG tìm căn cứ pháp lý
  - suggest_trich_yeu() : LLM generate / template fallback
  - suggest_so_ki_hieu(): Rule-based, không cần LLM
"""
import json
import logging
import re
from datetime import date

from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)


# ── Căn cứ pháp lý ───────────────────────────────────────────────────────────

def _extract_can_cu_from_chunk(content: str) -> list[str]:
    """
    Trích dòng căn cứ từ nội dung chunk.
    Pattern: "Căn cứ ...", "Theo Luật/NĐ/...", "- Luật/NĐ/..."
    """
    patterns = [
        r"Căn cứ\s+.{10,200}[;.]",
        r"Theo\s+(?:Luật|Nghị định|Thông tư|Quyết định)\s+.{10,200}[;.]",
        r"-\s+(?:Luật|Nghị định|Thông tư|Quyết định|Công văn)\s+.{10,200}[;.]",
    ]
    results: list[str] = []
    for pattern in patterns:
        for m in re.findall(pattern, content, re.DOTALL):
            cleaned = m.strip().rstrip(";.")
            if 20 < len(cleaned) < 300:
                results.append(cleaned)
    return results[:3]


async def suggest_can_cu(
    loai_vb: str,
    trich_yeu: str,
    db: AsyncSession,
    top_k: int = 5,
) -> list[dict]:
    """
    RAG tìm căn cứ pháp lý phù hợp với loại VB + trích yếu.
    Trả về list các căn cứ có thể chọn.
    """
    from app.services.rag_service import rag_service

    query = f"căn cứ pháp lý {loai_vb} về {trich_yeu}"
    logger.info("[suggest] can_cu query: %.80s", query)

    chunks = await rag_service.retrieve(query, db, top_k=top_k * 2, min_score=0.2)
    if not chunks:
        logger.info("[suggest] no chunks found for can_cu")
        return []

    reranked = rag_service.rerank(query, chunks, top_n=top_k)

    results: list[dict] = []
    seen: set[str] = set()

    for chunk in reranked:
        can_cu_list = _extract_can_cu_from_chunk(chunk["content"])
        for can_cu in can_cu_list:
            if can_cu not in seen:
                seen.add(can_cu)
                results.append({
                    "text": can_cu,
                    "source_doc": chunk.get("document_title") or "",
                    "so_ki_hieu": chunk.get("so_ki_hieu"),
                    "score": float(chunk.get("score") or 0),
                    "rerank_score": float(chunk.get("rerank_score") or 0),
                })

    logger.info("[suggest] can_cu found %d items", len(results))
    return results[:top_k]


# ── Trích yếu ────────────────────────────────────────────────────────────────

_TRICH_YEU_TEMPLATES: dict[str, list[str]] = {
    "Quyết định": [
        "Ban hành {mo_ta}",
        "Phê duyệt {mo_ta}",
        "Công bố {mo_ta}",
    ],
    "Công văn": [
        "Về việc {mo_ta}",
        "Về {mo_ta} theo yêu cầu",
        "Trả lời {mo_ta}",
    ],
    "Thông báo": [
        "Thông báo về {mo_ta}",
        "Thông báo {mo_ta}",
        "Thông báo triệu tập {mo_ta}",
    ],
    "Tờ trình": [
        "Tờ trình về {mo_ta}",
        "Đề nghị phê duyệt {mo_ta}",
        "Trình {mo_ta}",
    ],
    "Báo cáo": [
        "Báo cáo {mo_ta}",
        "Báo cáo kết quả {mo_ta}",
        "Tổng kết {mo_ta}",
    ],
    "Kế hoạch": [
        "Kế hoạch {mo_ta}",
        "Kế hoạch triển khai {mo_ta}",
        "Kế hoạch thực hiện {mo_ta}",
    ],
}

_DEFAULT_TEMPLATES = [
    "Về {mo_ta}",
    "Về việc {mo_ta}",
    "Thực hiện {mo_ta}",
]


def _template_trich_yeu(loai_vb: str, mo_ta: str) -> list[str]:
    fallback_mo_ta = mo_ta or "thực hiện nhiệm vụ"
    tpls = _TRICH_YEU_TEMPLATES.get(loai_vb, _DEFAULT_TEMPLATES)
    return [t.format(mo_ta=fallback_mo_ta) for t in tpls]


async def suggest_trich_yeu(
    loai_vb: str,
    mo_ta: str = "",
) -> tuple[list[str], bool]:
    """
    Gợi ý 3 trích yếu cho loại VB.
    Trả về (suggestions, fallback_used).
    LLM offline → fallback template.
    """
    from app.services.llm_service import llm_service

    if not llm_service._base_url:
        logger.info("[suggest] trich_yeu fallback (LLM offline)")
        return _template_trich_yeu(loai_vb, mo_ta), True

    prompt = (
        f"Tạo 3 mẫu trích yếu cho {loai_vb} "
        f"về chủ đề: {mo_ta if mo_ta else 'chủ đề hành chính'}.\n\n"
        "Yêu cầu:\n"
        "- Mỗi trích yếu ngắn gọn, dưới 100 ký tự\n"
        "- Đúng format NĐ30: bắt đầu bằng động từ\n"
        '- Trả về JSON object với key "items": ["trích yếu 1", "trích yếu 2", "trích yếu 3"]\n'
        "- Không giải thích thêm"
    )

    try:
        response = await llm_service.chat(
            [{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=200,
            json_mode=True,
        )
        data = json.loads(response)
        if isinstance(data, list):
            suggestions = [str(s) for s in data[:3]]
        elif isinstance(data, dict):
            # Thử key "items" trước, rồi lấy giá trị list đầu tiên
            suggestions = None
            for v in data.values():
                if isinstance(v, list):
                    suggestions = [str(s) for s in v[:3]]
                    break
            if not suggestions:
                raise ValueError("no list in LLM response")
        else:
            raise ValueError("unexpected LLM response type")

        if suggestions:
            logger.info("[suggest] trich_yeu LLM ok: %d items", len(suggestions))
            return suggestions, False
    except Exception as exc:
        logger.warning("[suggest] trich_yeu LLM fail: %s — using template", exc)

    return _template_trich_yeu(loai_vb, mo_ta), True


# ── Số / ký hiệu ─────────────────────────────────────────────────────────────

_LOAI_MAP: dict[str, str] = {
    "Quyết định": "QĐ",
    "Công văn": "CV",
    "Thông báo": "TB",
    "Tờ trình": "TTr",
    "Báo cáo": "BC",
    "Kế hoạch": "KH",
    "Hướng dẫn": "HD",
    "Chỉ thị": "CT",
    "Nghị quyết": "NQ",
    "Giấy mời": "GM",
    "Giấy giới thiệu": "GGT",
    "Giấy nghỉ phép": "GNP",
}

_CO_QUAN_MAP: dict[str, str] = {
    "ubnd": "UBND",
    "sở tư pháp": "STP",
    "sở giáo dục": "SGD",
    "sở nội vụ": "SNV",
    "sở tài chính": "STC",
    "sở y tế": "SYT",
    "sở công thương": "SCT",
    "sở lao động": "SLĐTBXH",
    "sở kế hoạch": "SKHĐT",
    "sở xây dựng": "SXD",
    "sở tài nguyên": "STNMT",
    "sở giao thông": "SGTVT",
    "phòng tư pháp": "PTP",
    "ban quản lý": "BQL",
}


def suggest_so_ki_hieu(loai_vb: str, co_quan: str = "") -> dict:
    """
    Rule-based format số/ký hiệu theo NĐ30.
    Không dùng LLM.
    """
    year = date.today().year
    ky_hieu_vb = _LOAI_MAP.get(loai_vb, "VB")

    co_quan_viet_tat = "CQ"
    co_quan_lower = co_quan.lower()
    for k, v in _CO_QUAN_MAP.items():
        if k in co_quan_lower:
            co_quan_viet_tat = v
            break

    so_ki_hieu = f"{{số}}/{year}/{ky_hieu_vb}-{co_quan_viet_tat}"

    return {
        "so_ki_hieu": so_ki_hieu,
        "format_giai_thich": (
            f"{{số}}: số thứ tự trong năm | "
            f"{year}: năm ban hành | "
            f"{ky_hieu_vb}: loại văn bản | "
            f"{co_quan_viet_tat}: cơ quan ban hành"
        ),
        "vi_du": f"15/{year}/{ky_hieu_vb}-{co_quan_viet_tat}",
    }
