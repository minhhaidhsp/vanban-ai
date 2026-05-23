"""
Hallucination guard — kiểm tra citations trong answer có xuất hiện
trong danh sách chunks không.

Citation formats được hỗ trợ:
  [1], [2], ...  → số thứ tự chunk trong context
  [Nguồn: xxx]   → so_ki_hieu hoặc document_title của chunk
"""
import re
from dataclasses import dataclass, field


@dataclass
class ValidationResult:
    is_valid: bool
    confidence_score: float        # tổng hợp 0.0 – 1.0
    citation_score: float          # 0.0 – 1.0 (từ citation format check)
    semantic_score: float          # 0.0 – 1.0 (từ embedding similarity)
    valid_citations: list[str]
    invalid_citations: list[str]
    has_disclaimer: bool           # True nếu confidence_score < 0.5
    message: str


def validate(answer: str, chunks: list[dict]) -> ValidationResult:
    """
    Parse citations từ answer và kiểm tra xem chúng có xuất hiện
    trong chunks không. Hàm đồng bộ — dùng trong pipeline không cần async.
    """
    raw_citations = re.findall(
        r'\[Nguồn:\s*([^\]]+)\]|\[(\d+)\]',
        answer,
    )

    if not raw_citations:
        return ValidationResult(
            is_valid=True,
            confidence_score=0.5,
            citation_score=0.5,
            semantic_score=0.0,
            valid_citations=[],
            invalid_citations=[],
            has_disclaimer=False,
            message="Không có citation để kiểm tra",
        )

    chunk_sources: set[str] = set()
    for chunk in chunks:
        if chunk.get("so_ki_hieu"):
            chunk_sources.add(chunk["so_ki_hieu"].strip().lower())
        if chunk.get("document_title"):
            chunk_sources.add(chunk["document_title"].strip().lower())

    valid: list[str] = []
    invalid: list[str] = []

    for cite_source, cite_num in raw_citations:
        if cite_num:
            idx = int(cite_num) - 1
            if 0 <= idx < len(chunks):
                valid.append(cite_num)
            else:
                invalid.append(cite_num)
        else:
            if cite_source.strip().lower() in chunk_sources:
                valid.append(cite_source.strip())
            else:
                invalid.append(cite_source.strip())

    total = len(valid) + len(invalid)
    score = len(valid) / total if total > 0 else 0.5

    return ValidationResult(
        is_valid=len(invalid) == 0,
        confidence_score=score,
        citation_score=score,
        semantic_score=0.0,
        valid_citations=valid,
        invalid_citations=invalid,
        has_disclaimer=score < 0.5,
        message=(
            "OK"
            if not invalid
            else f"{len(invalid)} citation không tìm thấy trong nguồn"
        ),
    )


async def semantic_similarity_check(
    answer: str,
    chunks: list[dict],
) -> float:
    """
    Embed answer → so sánh cosine với từng chunk → trả về max similarity score.
    Chỉ dùng 500 ký tự đầu để tiết kiệm thời gian.
    """
    import asyncio
    import numpy as np
    from app.services.embedding_service import embed_text

    if not answer or not chunks:
        return 0.0

    try:
        answer_vec = await asyncio.to_thread(embed_text, answer[:500])
        answer_arr = np.array(answer_vec)

        similarities = []
        for chunk in chunks:
            content = chunk.get("content", "")
            if not content:
                continue
            chunk_vec = await asyncio.to_thread(embed_text, content[:500])
            chunk_arr = np.array(chunk_vec)

            dot = np.dot(answer_arr, chunk_arr)
            norm = np.linalg.norm(answer_arr) * np.linalg.norm(chunk_arr)
            sim = float(dot / norm) if norm > 0 else 0.0
            similarities.append(sim)

        return max(similarities) if similarities else 0.0
    except Exception:
        return 0.0


async def validate_full(
    answer: str,
    chunks: list[dict],
) -> ValidationResult:
    """
    Validate đa chiều:
    - citation_score : 40% weight
    - semantic_score : 40% weight
    - length_score   : 20% weight (answer quá ngắn < 50 chars → suspect)
    """
    citation_result = validate(answer, chunks)
    citation_score = citation_result.citation_score

    semantic_score = await semantic_similarity_check(answer, chunks)

    length_score = min(1.0, len(answer) / 200)

    confidence = (
        0.4 * citation_score
        + 0.4 * semantic_score
        + 0.2 * length_score
    )

    has_disclaimer = confidence < 0.5

    return ValidationResult(
        is_valid=confidence >= 0.4,
        confidence_score=round(confidence, 3),
        citation_score=round(citation_score, 3),
        semantic_score=round(semantic_score, 3),
        valid_citations=citation_result.valid_citations,
        invalid_citations=citation_result.invalid_citations,
        has_disclaimer=has_disclaimer,
        message=(
            "OK" if confidence >= 0.7
            else "Cần kiểm tra lại" if confidence >= 0.4
            else "Độ tin cậy thấp"
        ),
    )
