"""
Re-trigger AI metadata extraction for reference documents with missing trich_yeu.

Usage:
    cd D:/Projects/vanban-ai/backend
    python scripts/retrigger_metadata.py

    # Dry-run (no changes):
    python scripts/retrigger_metadata.py --dry-run

    # Specific doc IDs only:
    python scripts/retrigger_metadata.py --ids aed3f154 f7c7c4b1
"""
import asyncio
import io
import sys
import uuid
import logging
import argparse

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

BUCKET = "reference-docs"


async def fetch_missing_docs(db, ids_filter: list[str] | None) -> list[dict]:
    """Return docs where trich_yeu is empty and have a file_path."""
    from sqlalchemy import text

    if ids_filter:
        placeholders = ", ".join(f"'{i}'" for i in ids_filter)
        sql = f"""
            SELECT id, title, file_path, file_type, created_by
            FROM reference_documents
            WHERE id IN ({placeholders})
            ORDER BY created_at DESC
        """
    else:
        sql = """
            SELECT id, title, file_path, file_type, created_by
            FROM reference_documents
            WHERE (trich_yeu IS NULL OR trich_yeu = '')
              AND file_path IS NOT NULL AND file_path != ''
            ORDER BY created_at DESC
        """

    r = await db.execute(text(sql))
    rows = r.fetchall()
    return [
        {"id": row[0], "title": row[1], "file_path": row[2],
         "file_type": row[3], "created_by": str(row[4])}
        for row in rows
    ]


def read_minio_file(file_path: str) -> bytes:
    from app.core.storage import get_minio_client
    client = get_minio_client()
    response = client.get_object(BUCKET, file_path)
    try:
        return response.read()
    finally:
        response.close()
        response.release_conn()


async def retrigger_one(doc: dict, dry_run: bool) -> bool:
    from app.services.reference_pipeline_service import process_reference_background

    doc_id   = doc["id"]
    filename = doc["title"] or "unknown.pdf"
    file_path = doc["file_path"]
    file_type = doc["file_type"] or "application/pdf"
    owner_id  = doc["created_by"]
    job_id    = str(uuid.uuid4())

    logger.info("[retrigger] doc=%s  file=%s", doc_id, filename)

    if dry_run:
        logger.info("[retrigger] DRY-RUN — skipping")
        return True

    # Read file from MinIO
    try:
        file_data = await asyncio.to_thread(read_minio_file, file_path)
        logger.info("[retrigger] read %d bytes from MinIO", len(file_data))
    except Exception as e:
        logger.error("[retrigger] MinIO read failed for %s: %s", doc_id, e)
        return False

    # Run pipeline (same function as batch upload uses)
    try:
        await process_reference_background(
            job_id=job_id,
            doc_id=doc_id,
            file_data=file_data,
            filename=filename,
            file_type=file_type,
            owner_id=owner_id,
        )
        logger.info("[retrigger] done  doc=%s", doc_id)
        return True
    except Exception as e:
        logger.error("[retrigger] pipeline failed for %s: %s", doc_id, e)
        return False


async def main(dry_run: bool, ids_filter: list[str] | None, concurrency: int):
    from app.core.database import get_db

    async for db in get_db():
        docs = await fetch_missing_docs(db, ids_filter)
        break  # only need one session for the query

    if not docs:
        logger.info("No documents to process.")
        return

    logger.info("Found %d docs to re-process%s", len(docs),
                " (DRY-RUN)" if dry_run else "")
    for d in docs:
        logger.info("  [%s] %s", d["id"][:8], d["title"])

    # Process with limited concurrency to avoid hammering LLM
    sem = asyncio.Semaphore(concurrency)

    async def _bounded(doc):
        async with sem:
            return await retrigger_one(doc, dry_run)

    results = await asyncio.gather(*[_bounded(d) for d in docs])
    ok  = sum(1 for r in results if r)
    err = sum(1 for r in results if not r)
    logger.info("Finished: %d succeeded, %d failed", ok, err)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Re-trigger metadata extraction")
    parser.add_argument("--dry-run", action="store_true",
                        help="Print what would be processed without running")
    parser.add_argument("--ids", nargs="*", default=None,
                        help="Process only these doc IDs (space-separated)")
    parser.add_argument("--concurrency", type=int, default=2,
                        help="Max parallel pipeline jobs (default: 2)")
    args = parser.parse_args()

    asyncio.run(main(dry_run=args.dry_run, ids_filter=args.ids,
                     concurrency=args.concurrency))
