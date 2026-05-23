"""
Test script — metadata extraction on a real reference document.

Usage:
    cd backend
    venv\\Scripts\\python scripts\\test_metadata_extraction.py
"""
import asyncio
import io
import json
import sys
import os

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

TARGET_SO_KI_HIEU = "552-2025"   # QD 552-2025 Linh vuc Ho tich
REF_DOCS_BUCKET = "reference-docs"


def _extract_pdf(data: bytes) -> str:
    import pdfplumber
    with pdfplumber.open(io.BytesIO(data)) as pdf:
        pages = [p.extract_text() or "" for p in pdf.pages]
    return "\n\n".join(p for p in pages if p.strip())


async def main():
    from sqlalchemy import select
    from app.core.database import AsyncSessionLocal
    from app.models.reference_document import ReferenceDocument
    from app.core.storage import get_minio_client
    from app.services.llm_service import llm_service
    from app.services.metadata_extraction_service import extract_metadata

    # 1. Find document
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(ReferenceDocument).where(
                ReferenceDocument.so_ki_hieu.contains(TARGET_SO_KI_HIEU)
            ).limit(1)
        )
        doc = result.scalar_one_or_none()

    if not doc:
        # Fallback: pick first doc with a file
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(ReferenceDocument)
                .where(ReferenceDocument.file_path.isnot(None))
                .limit(1)
            )
            doc = result.scalar_one_or_none()

    if not doc:
        print("ERROR: no reference document with a file found in DB")
        return

    print(f"Using doc: id={doc.id}  so={doc.so_ki_hieu!r}")
    print(f"File: {doc.file_path}")

    # 2. Download from MinIO
    print("\nDownloading from MinIO...")
    client = get_minio_client()
    response = client.get_object(REF_DOCS_BUCKET, doc.file_path)
    try:
        file_data = response.read()
    finally:
        response.close()
        response.release_conn()
    print(f"Downloaded {len(file_data):,} bytes")

    # 3. Extract text
    print("Extracting text...")
    text = _extract_pdf(file_data)
    print(f"Extracted {len(text):,} chars  (snippet: {text[:80].encode('ascii','replace').decode()}...)")

    # 4. Check LLM
    print(f"\nLLM base_url: {llm_service._base_url or '(not configured)'}")
    if not llm_service._base_url:
        print("ERROR: LLM_BASE_URL not set. Add to .env and restart.")
        return

    # 5. Extract metadata
    print("Calling extract_metadata()...")
    meta = await extract_metadata(text, doc.id, llm_service)

    # 6. Print result
    print("\n" + "=" * 60)
    print("METADATA RESULT:")
    print("=" * 60)
    print(json.dumps(meta, ensure_ascii=True, indent=2))
    print("=" * 60)

    non_null = sum(
        1 for k in ("so_ki_hieu", "ngay_ban_hanh", "co_quan_ban_hanh",
                    "nguoi_ky", "trich_yeu", "can_cu", "hieu_luc", "tom_tat")
        if meta.get(k) not in (None, [], "")
    )
    print(f"\nFields populated: {non_null}/8")


if __name__ == "__main__":
    asyncio.run(main())
