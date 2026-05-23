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
    confidence_score: float        # 0.0 – 1.0
    valid_citations: list[str]
    invalid_citations: list[str]
    message: str


def validate(answer: str, chunks: list[dict]) -> ValidationResult:
    """
    Parse citations từ answer và kiểm tra xem chúng có xuất hiện
    trong chunks không.
    """
    # Pattern: [Nguồn: xxx] hoặc [số]
    raw_citations = re.findall(
        r'\[Nguồn:\s*([^\]]+)\]|\[(\d+)\]',
        answer,
    )

    if not raw_citations:
        return ValidationResult(
            is_valid=True,
            confidence_score=0.5,
            valid_citations=[],
            invalid_citations=[],
            message="Không có citation để kiểm tra",
        )

    # Tập hợp nguồn hợp lệ từ chunks (lowercase để so sánh)
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
            # [1], [2]... → hợp lệ nếu index nằm trong range
            idx = int(cite_num) - 1
            if 0 <= idx < len(chunks):
                valid.append(cite_num)
            else:
                invalid.append(cite_num)
        else:
            # [Nguồn: xxx] → kiểm tra trong chunk_sources
            if cite_source.strip().lower() in chunk_sources:
                valid.append(cite_source.strip())
            else:
                invalid.append(cite_source.strip())

    total = len(valid) + len(invalid)
    score = len(valid) / total if total > 0 else 0.5

    return ValidationResult(
        is_valid=len(invalid) == 0,
        confidence_score=score,
        valid_citations=valid,
        invalid_citations=invalid,
        message=(
            "OK"
            if not invalid
            else f"{len(invalid)} citation không tìm thấy trong nguồn"
        ),
    )
