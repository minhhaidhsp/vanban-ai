"""
Test fallback chain cho RAG khi LLM offline.

Usage:
    cd backend
    .\\venv\\Scripts\\python.exe scripts\\test_fallback.py
"""
import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

LLM_URL = "https://write-link-wed-asus.trycloudflare.com"

PASS = "[PASS]"
FAIL = "[FAIL]"


def s(text) -> str:
    if text is None:
        return "None"
    return str(text).encode("ascii", "replace").decode()


async def test():
    from app.services.llm_service import llm_service
    from app.services.rag_service import rag_service
    from app.core.database import AsyncSessionLocal

    llm_service.update_base_url(LLM_URL)
    print(f"LLM URL: {llm_service._base_url}\n")

    async with AsyncSessionLocal() as db:

        # ── Test 1: Normal flow (LLM online) ─────────────────────────────────
        print("=== Test 1: Normal flow (LLM online) ===")
        result = await rag_service.query(
            "thu tuc hanh chinh ho tich", db
        )
        ok1 = (
            result.get("llm_available") is True
            and result.get("fallback_mode") is False
            and "LLM" not in result["answer"][:30]
        )
        print(f"llm_available : {result.get('llm_available')}")
        print(f"fallback_mode : {result.get('fallback_mode')}")
        print(f"answer[:80]   : {s(result['answer'])[:80]}")
        print(f"confidence    : {result['confidence']}")
        print(PASS if ok1 else FAIL, "Normal flow")
        print()

        # ── Test 2: Fallback khi LLM offline ─────────────────────────────────
        print("=== Test 2: Fallback khi LLM offline ===")
        original_url = llm_service._base_url
        llm_service.update_base_url("")

        result2 = await rag_service.query(
            "thu tuc hanh chinh ho tich", db
        )
        ok2 = (
            result2.get("llm_available") is False
            and result2.get("fallback_mode") is True
            and len(result2["chunks_used"]) > 0
            and "LLM" in result2["answer"]
        )
        print(f"llm_available : {result2.get('llm_available')}")
        print(f"fallback_mode : {result2.get('fallback_mode')}")
        print(f"chunks_used   : {len(result2['chunks_used'])}")
        print(f"answer[:80]   : {s(result2['answer'])[:80]}")
        print(f"has_disclaimer: {result2.get('has_disclaimer')}")
        print(PASS if ok2 else FAIL, "Fallback flow")

        llm_service.update_base_url(original_url)
        print()

        # ── Test 3: Retry relaxed threshold ───────────────────────────────────
        print("=== Test 3: Retry relaxed threshold (min_score=0.99) ===")
        result3 = await rag_service.query(
            "thu tuc hanh chinh ho tich", db,
            min_score=0.99,
        )
        ok3 = len(result3["chunks_used"]) > 0
        print(f"chunks_used after retry: {len(result3['chunks_used'])}")
        print(f"answer[:60]: {s(result3['answer'])[:60]}")
        print(PASS if ok3 else FAIL, "Retry relaxed threshold")
        print()

        # ── Test 4: Hybrid search standalone ─────────────────────────────────
        print("=== Test 4: Hybrid search standalone ===")
        hybrid_chunks = await rag_service.hybrid_search("ho tich", db, top_k=5)
        ok4 = len(hybrid_chunks) > 0
        print(f"Hybrid chunks: {len(hybrid_chunks)}")
        for c in hybrid_chunks:
            print(
                f"  hybrid={c.get('hybrid_score', 0):.3f}  "
                f"semantic={float(c.get('score') or 0):.3f}  "
                f"title={s(str(c.get('document_title', '')))[:35]}"
            )
        print(PASS if ok4 else FAIL, "Hybrid search")
        print()

        # ── Tóm tắt ──────────────────────────────────────────────────────────
        results = [ok1, ok2, ok3, ok4]
        passed = sum(results)
        print(f"=== Tong ket: {passed}/{len(results)} tests passed ===")


asyncio.run(test())
