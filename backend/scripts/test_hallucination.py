"""
Test hallucination guard v2 (semantic similarity + citation check).

Usage:
    cd backend
    .\\venv\\Scripts\\python.exe scripts\\test_hallucination.py
"""
import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def s(text) -> str:
    if text is None:
        return "None"
    return str(text).encode("ascii", "replace").decode()


async def test():
    from app.services.llm_service import llm_service
    from app.services.rag_service import rag_service
    from app.core.database import AsyncSessionLocal

    llm_service.update_base_url(
        "https://write-link-wed-asus.trycloudflare.com"
        # thay bằng URL hiện tại nếu tunnel đã thay đổi
    )
    print(f"LLM URL: {llm_service._base_url}")
    print()

    async with AsyncSessionLocal() as db:

        # ── Test 1: Query bình thường ─────────────────────────────────────────
        print("=== Test 1: Query binh thuong ===")
        result = await rag_service.query(
            "Quy dinh ve thu tuc hanh chinh ho tich",
            db,
        )
        print(f"Answer     : {s(result['answer'])[:200]}")
        print(f"Confidence : {result['confidence']}")
        print(f"Citation   : {result['citation_score']}")
        print(f"Semantic   : {result['semantic_score']}")
        print(f"Disclaimer : {result['has_disclaimer']}")
        print(f"Citations  : {result['citations']}")
        print()

        # ── Test 2: Query không có kết quả ───────────────────────────────────
        print("=== Test 2: Khong co ket qua ===")
        result2 = await rag_service.query(
            "Quy dinh ve xay dung cau duong",
            db,
        )
        print(f"Answer     : {s(result2['answer'])}")
        print(f"Confidence : {result2['confidence']}")
        print()

        # ── Test 3: Score breakdown ───────────────────────────────────────────
        print("=== Test 3: Score breakdown ===")
        print(f"citation_score : {result['citation_score']:.3f}  (40% weight)")
        print(f"semantic_score : {result['semantic_score']:.3f}  (40% weight)")
        length_score = min(1.0, len(result['answer']) / 200)
        print(f"length_score   : {length_score:.3f}  (20% weight)")
        expected = (
            0.4 * result['citation_score']
            + 0.4 * result['semantic_score']
            + 0.2 * length_score
        )
        print(f"expected conf  : {expected:.3f}")
        print(f"actual conf    : {result['confidence']:.3f}")
        print()

        # ── Test 4: validate_full trực tiếp ──────────────────────────────────
        print("=== Test 4: validate_full truc tiep ===")
        from app.services.hallucination_guard import validate_full
        dummy_chunks = [
            {
                "content": "Dieu 10 quy dinh thu tuc dang ky ho tich can co giay to tuy than.",
                "so_ki_hieu": "30/2020/ND-CP",
                "document_title": "Nghi dinh 30",
            }
        ]
        vr = await validate_full(
            "Theo quy dinh [1], thu tuc dang ky ho tich can giay to tuy than.",
            dummy_chunks,
        )
        print(f"is_valid       : {vr.is_valid}")
        print(f"confidence     : {vr.confidence_score}")
        print(f"citation_score : {vr.citation_score}")
        print(f"semantic_score : {vr.semantic_score}")
        print(f"has_disclaimer : {vr.has_disclaimer}")
        print(f"message        : {s(vr.message)}")


asyncio.run(test())
