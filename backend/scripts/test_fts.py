"""Test full-text search."""
import asyncio, sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


async def main():
    from app.core.database import AsyncSessionLocal
    from sqlalchemy import text

    async with AsyncSessionLocal() as db:
        # Test 1: ho tich
        rows = await db.execute(text(
            "SELECT title, so_ki_hieu,"
            " ts_rank(search_vector, to_tsquery('simple', unaccent('ho & tich'))) as rank"
            " FROM reference_documents"
            " WHERE search_vector @@ to_tsquery('simple', unaccent('ho & tich'))"
            " ORDER BY rank DESC"
        ))
        results = rows.fetchall()
        print(f"Test 1 - 'ho tich': {len(results)} dong")
        for r in results:
            print(f"  rank={r.rank:.4f}  so_ki_hieu={r.so_ki_hieu!r}  title={r.title[:55]!r}")

        # Test 2: nuoi con
        rows2 = await db.execute(text(
            "SELECT title,"
            " ts_rank(search_vector, to_tsquery('simple', unaccent('nuoi & con'))) as rank"
            " FROM reference_documents"
            " WHERE search_vector @@ to_tsquery('simple', unaccent('nuoi & con'))"
            " ORDER BY rank DESC"
        ))
        results2 = rows2.fetchall()
        print(f"Test 2 - 'nuoi con': {len(results2)} dong")
        for r in results2:
            print(f"  rank={r.rank:.4f}  title={r.title[:60]!r}")


asyncio.run(main())
