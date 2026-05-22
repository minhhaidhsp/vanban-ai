"""Re-embed all reference_documents: delete old chunks and rebuild from scratch."""
import asyncio, sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


async def main():
    from app.core.database import AsyncSessionLocal
    from app.models.reference_document import ReferenceDocument
    from app.models.reference_doc_chunk import ReferenceDocChunk
    from app.services.pipeline_service import process_document_embedding
    from sqlalchemy import select, delete as sa_delete

    async with AsyncSessionLocal() as db:
        # Delete ALL existing chunks first
        deleted = await db.execute(sa_delete(ReferenceDocChunk))
        print(f"Deleted {deleted.rowcount} old chunk(s)")

        result = await db.execute(
            select(ReferenceDocument).where(ReferenceDocument.file_path.is_not(None))
        )
        docs = result.scalars().all()
        print(f"Found {len(docs)} doc(s) with files")
        for doc in docs:
            print(f"  -> {doc.id}  {doc.trich_yeu[:50]}")

        await db.commit()

    for doc in docs:
        print(f"\nProcessing {doc.id} ...")
        await process_document_embedding(doc.id)
        print(f"Done: {doc.id}")

    # Verify
    async with AsyncSessionLocal() as db:
        from sqlalchemy import text
        rows = await db.execute(text("""
            SELECT rd.title,
                   COUNT(rdc.id)            AS so_chunk,
                   ROUND(AVG(rdc.token_count)::numeric, 1) AS avg_tokens
            FROM reference_documents rd
            LEFT JOIN reference_doc_chunks rdc ON rd.id = rdc.document_id
            GROUP BY rd.id, rd.title
            ORDER BY rd.title
        """))
        print("\n--- Chunk stats ---")
        print(f"{'title':<40}  {'so_chunk':>8}  {'avg_tokens':>10}")
        print("-" * 62)
        for row in rows:
            print(f"{row.title:<40}  {row.so_chunk:>8}  {str(row.avg_tokens):>10}")


asyncio.run(main())
