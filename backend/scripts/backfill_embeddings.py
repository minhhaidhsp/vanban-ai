"""Backfill embeddings cho các doc đã có file nhưng chưa có embedding."""
import asyncio, sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

async def main():
    from app.core.database import AsyncSessionLocal
    from app.models.reference_document import ReferenceDocument
    from app.services.pipeline_service import process_document_embedding
    from sqlalchemy import select

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(ReferenceDocument)
            .where(ReferenceDocument.file_path.is_not(None))
            .where(ReferenceDocument.embedding.is_(None))
        )
        docs = result.scalars().all()
        print(f"Found {len(docs)} doc(s) without embedding")
        for doc in docs:
            print(f"  -> {doc.id}  {doc.trich_yeu[:40]}")

    for doc in docs:
        print(f"\nProcessing {doc.id} ...")
        await process_document_embedding(doc.id)
        print(f"Done: {doc.id}")

asyncio.run(main())
