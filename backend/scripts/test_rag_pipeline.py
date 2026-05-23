"""
Test script cho RAG pipeline.

Usage:
    cd backend
    .\\venv\\Scripts\\python.exe scripts\\test_rag_pipeline.py
"""
import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def s(text) -> str:
    """Safe ASCII print (tránh UnicodeEncodeError trên Windows terminal)."""
    if text is None:
        return "None"
    return str(text).encode("ascii", "replace").decode()


async def test():
    from app.services.rag_service import rag_service
    from app.services.llm_service import llm_service
    from app.core.database import AsyncSessionLocal

    llm_service.update_base_url(
        "https://sic-specify-volunteer-snow.trycloudflare.com"
    )
    print(f"LLM URL set: {llm_service._base_url}")

    async with AsyncSessionLocal() as db:

        # ── Test 1: query có kết quả ──────────────────────────────────────
        print("=== Test 1: Query co ket qua ===")
        result = await rag_service.query(
            "Quy định về thủ tục hành chính hộ tịch",
            db,
        )
        print(f"Answer: {s(result['answer'])[:300]}")
        print(f"Chunks used: {len(result['chunks_used'])}")
        print(f"Confidence: {result['confidence']:.3f}")
        print(f"Citations: {result['citations']}")
        print()

        # ── Test 2: query không có kết quả ───────────────────────────────
        print("=== Test 2: Query khong co ket qua ===")
        result2 = await rag_service.query(
            "Quy định về xây dựng cầu đường",
            db,
        )
        print(f"Answer: {s(result2['answer'])}")
        print(f"Chunks used: {len(result2['chunks_used'])}")
        print()

        # ── Test 3: chunks_used để verify rerank ─────────────────────────
        print("=== Test 3: Chunks used (rerank order) ===")
        for i, chunk in enumerate(result.get("chunks_used", [])):
            rerank_score = chunk.get("rerank_score")
            rerank_str = f"{rerank_score:.3f}" if rerank_score is not None else "N/A"
            print(
                f"[{i+1}] {s(chunk['so_ki_hieu'])} "
                f"| {s(chunk['dieu_khoan'])} "
                f"| score={chunk['score']:.3f} rerank={rerank_str}"
            )
            print(f"     {s(chunk['content_preview'])[:100]}")

        # ── Test 4: retrieve trực tiếp (không qua LLM) ───────────────────
        print()
        print("=== Test 4: Retrieve only ===")
        chunks = await rag_service.retrieve(
            "thủ tục đăng ký khai sinh",
            db,
            top_k=5,
            min_score=0.30,
        )
        print(f"Retrieved: {len(chunks)} chunks")
        for c in chunks:
            print(
                f"  score={float(c['score']):.3f}  "
                f"{s(c['so_ki_hieu'])} | {s(c['dieu_khoan'])}"
            )


if __name__ == "__main__":
    asyncio.run(test())
