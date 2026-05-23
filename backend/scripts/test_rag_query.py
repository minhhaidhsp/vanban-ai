import asyncio, sys, time

sys.path.insert(0, __import__('os').path.dirname(__import__('os').path.dirname(__import__('os').path.abspath(__file__))))

def s(t):
    return str(t).encode('ascii', 'replace').decode() if t else str(t)

async def main():
    from app.services.llm_service import llm_service
    from app.services.rag_service import rag_service
    from app.core.database import AsyncSessionLocal

    llm_service.update_base_url("https://sic-specify-volunteer-snow.trycloudflare.com")

    query = "Quy dinh ve thu tuc hanh chinh ho tich"

    async with AsyncSessionLocal() as db:
        t0 = time.monotonic()
        r = await rag_service.query(query, db, top_k=10, min_score=0.35)
        ms = int((time.monotonic() - t0) * 1000)

    print("=== POST /api/v1/rag/query ===")
    print("query        :", s(r["query"]))
    print("answer       :", s(r["answer"]))
    print("citations    :", r["citations"])
    print("confidence   :", r["confidence"])
    print("llm_available: True")
    print("latency_ms   :", ms)
    print("chunks_used  :", len(r["chunks_used"]), "items")
    for i, c in enumerate(r["chunks_used"]):
        rr = c.get("rerank_score")
        print(f"  [{i+1}] {s(c['so_ki_hieu'])} | {s(c['dieu_khoan'])} "
              f"score={c['score']:.3f} rerank={round(rr,3) if rr else 'N/A'}")
        print(f"       {s(c['content_preview'])[:120]}")

asyncio.run(main())
