"""
Benchmark RAG quality — chạy 10 câu hỏi chuẩn.
So sánh confidence tuần 9 vs tuần 10.

Usage:
    cd backend
    .\\venv\\Scripts\\python.exe scripts\\benchmark_rag.py
"""
import asyncio
import json
import sys
import os
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

LLM_URL = "https://write-link-wed-asus.trycloudflare.com"

TEST_CASES = [
    {
        "question": "Thu tuc dang ky khai sinh can gi?",
        "expected_keywords": ["ho tich", "giay to", "dang ky"],
    },
    {
        "question": "Quy dinh ve so ky hieu van ban hanh chinh?",
        "expected_keywords": ["so", "ky hieu", "van ban"],
    },
    {
        "question": "Thoi han giai quyet thu tuc hanh chinh?",
        "expected_keywords": ["ngay", "thoi han", "giai quyet"],
    },
    {
        "question": "Can cu phap ly ban hanh quyet dinh?",
        "expected_keywords": ["can cu", "luat", "nghi dinh"],
    },
    {
        "question": "Nuoi con nuoi can thu tuc gi?",
        "expected_keywords": ["nuoi con nuoi", "thu tuc"],
    },
    # Câu hỏi không có kết quả — test fallback
    {
        "question": "Quy dinh xay dung cau duong?",
        "expected_keywords": [],  # expect no result
    },
    {
        "question": "Thue thu nhap doanh nghiep?",
        "expected_keywords": [],
    },
    {
        "question": "Dang ky kinh doanh ho ca the?",
        "expected_keywords": [],
    },
    # Liên quan một phần
    {
        "question": "UBND thanh pho co tham quyen gi?",
        "expected_keywords": ["ubnd", "tham quyen"],
    },
    {
        "question": "So Tu phap quan ly linh vuc nao?",
        "expected_keywords": ["so tu phap", "quan ly"],
    },
]


def s(text) -> str:
    if text is None:
        return "None"
    return str(text).encode("ascii", "replace").decode()


async def run_benchmark():
    from app.services.llm_service import llm_service
    from app.services.rag_service import rag_service
    from app.core.database import AsyncSessionLocal

    llm_service.update_base_url(LLM_URL)
    print(f"LLM URL : {llm_service._base_url}")
    print(f"Started : {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")

    results = []
    async with AsyncSessionLocal() as db:
        for i, case in enumerate(TEST_CASES):
            label = s(case["question"])[:50]
            print(f"[{i+1:02d}/10] {label}...")
            try:
                result = await rag_service.query(case["question"], db)

                answer_lower = result["answer"].lower()
                has_result = len(result["chunks_used"]) > 0
                keyword_hit = (
                    any(kw.lower() in answer_lower for kw in case["expected_keywords"])
                    if case["expected_keywords"]
                    else True  # no-result questions always "pass"
                )

                results.append({
                    "question": case["question"],
                    "confidence": result["confidence"],
                    "citation_score": result.get("citation_score", 0.0),
                    "semantic_score": result.get("semantic_score", 0.0),
                    "has_result": has_result,
                    "keyword_hit": keyword_hit,
                    "fallback": result.get("fallback_mode", False),
                    "has_disclaimer": result.get("has_disclaimer", False),
                    "chunks": len(result["chunks_used"]),
                })
                icon = "+" if keyword_hit else "~"
                print(
                    f"       [{icon}] conf={result['confidence']:.3f} "
                    f"cit={result.get('citation_score', 0):.2f} "
                    f"sem={result.get('semantic_score', 0):.2f} "
                    f"chunks={len(result['chunks_used'])} "
                    f"fb={result.get('fallback_mode', False)}"
                )
            except Exception as exc:
                print(f"       ERROR: {exc}")
                results.append({"question": case["question"], "error": str(exc)})

    # ── Report ──────────────────────────────────────────────────────────────────
    print()
    print("=" * 65)
    print("BENCHMARK REPORT — VanBan.AI RAG  (Tuan 10)")
    print(f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    print("=" * 65)

    valid = [r for r in results if "error" not in r]
    errors = [r for r in results if "error" in r]

    if valid:
        avg_conf = sum(r["confidence"] for r in valid) / len(valid)
        avg_cit  = sum(r["citation_score"] for r in valid) / len(valid)
        avg_sem  = sum(r["semantic_score"] for r in valid) / len(valid)
        hits     = sum(1 for r in valid if r["keyword_hit"])
        with_res = sum(1 for r in valid if r["has_result"])
        fallbacks = sum(1 for r in valid if r["fallback"])

        print(f"Avg confidence : {avg_conf:.3f}")
        print(f"Avg citation   : {avg_cit:.3f}")
        print(f"Avg semantic   : {avg_sem:.3f}")
        print(f"Keyword hits   : {hits}/{len(valid)}")
        print(f"Has result     : {with_res}/{len(valid)}")
        print(f"Fallback mode  : {fallbacks}/{len(valid)}")
        print()

    for r in results:
        if "error" in r:
            print(f"  [ERR] {s(r['question'])[:45]}")
            print(f"        {r['error']}")
        else:
            icon = "OK" if r["keyword_hit"] else "??"
            disc = " [DISC]" if r.get("has_disclaimer") else ""
            fb   = " [FB]"   if r.get("fallback")       else ""
            print(
                f"  [{icon}] conf={r['confidence']:.3f} "
                f"cit={r['citation_score']:.2f} "
                f"sem={r['semantic_score']:.2f} "
                f"chunks={r['chunks']}{disc}{fb}"
            )
            print(f"        {s(r['question'])[:55]}")

    # ── Save JSON ────────────────────────────────────────────────────────────────
    out_path = os.path.join(os.path.dirname(__file__), "benchmark_results.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(
            {
                "date": datetime.now().isoformat(),
                "llm_url": LLM_URL,
                "summary": {
                    "avg_confidence": round(avg_conf, 3) if valid else None,
                    "avg_citation":   round(avg_cit,  3) if valid else None,
                    "avg_semantic":   round(avg_sem,  3) if valid else None,
                    "keyword_hits":   f"{hits}/{len(valid)}" if valid else "0/0",
                    "has_result":     f"{with_res}/{len(valid)}" if valid else "0/0",
                },
                "results": results,
            },
            f,
            ensure_ascii=False,
            indent=2,
        )
    print(f"\nSaved -> {out_path}")


asyncio.run(run_benchmark())
