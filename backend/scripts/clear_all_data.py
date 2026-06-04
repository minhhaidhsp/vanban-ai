import asyncio
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()


async def clear_database():
    """Xóa toàn bộ data trong DB."""
    from app.core.database import AsyncSessionLocal
    from sqlalchemy import text

    async with AsyncSessionLocal() as db:
        print("Đang xóa reference_doc_chunks...")
        result = await db.execute(text("DELETE FROM reference_doc_chunks"))
        print(f"  → Đã xóa {result.rowcount} chunks")

        print("Đang xóa reference_documents...")
        result = await db.execute(text("DELETE FROM reference_documents"))
        print(f"  → Đã xóa {result.rowcount} tài liệu tham chiếu")

        print("Đang xóa ocr_jobs...")
        result = await db.execute(text("DELETE FROM ocr_jobs"))
        print(f"  → Đã xóa {result.rowcount} OCR jobs")

        print("Đang xóa documents...")
        result = await db.execute(text("DELETE FROM documents"))
        print(f"  → Đã xóa {result.rowcount} văn bản")

        await db.commit()
        print("✓ DB đã xóa xong")


def clear_r2_prefix(s3_client, bucket: str, prefix: str):
    """Xóa toàn bộ files trên R2 theo prefix."""
    print(f"Đang xóa R2 prefix '{prefix}'...")
    count = 0
    paginator = s3_client.get_paginator("list_objects_v2")
    for page in paginator.paginate(Bucket=bucket, Prefix=prefix):
        objects = page.get("Contents", [])
        if not objects:
            continue
        keys = [{"Key": obj["Key"]} for obj in objects]
        s3_client.delete_objects(Bucket=bucket, Delete={"Objects": keys})
        count += len(keys)
    print(f"  → Đã xóa {count} files")


def clear_r2():
    """Xóa toàn bộ files trên R2."""
    import boto3
    from botocore.config import Config
    from app.core.config import get_settings
    settings = get_settings()

    endpoint = settings.r2_endpoint
    if not endpoint.startswith("http"):
        endpoint = f"https://{endpoint}"

    s3 = boto3.client(
        "s3",
        endpoint_url=endpoint,
        aws_access_key_id=settings.r2_access_key_id,
        aws_secret_access_key=settings.r2_secret_access_key,
        config=Config(signature_version="s3v4", s3={"addressing_style": "path"}),
        region_name="auto",
    )
    bucket = settings.r2_bucket_name

    clear_r2_prefix(s3, bucket, "reference-docs/")
    clear_r2_prefix(s3, bucket, "ocr-jobs/")
    print("✓ R2 đã xóa xong")


async def main():
    print("=" * 50)
    print("XÓA TOÀN BỘ DỮ LIỆU")
    print("=" * 50)

    confirm = input(
        "\n⚠️  Thao tác này sẽ xóa TOÀN BỘ:\n"
        "  - Tất cả văn bản soạn thảo (documents)\n"
        "  - Tất cả kho tham chiếu (reference_documents + chunks)\n"
        "  - Tất cả OCR jobs\n"
        "  - Tất cả files trên R2\n\n"
        "Gõ 'XOA' để xác nhận: "
    )
    if confirm.strip() != "XOA":
        print("Đã hủy.")
        return

    await clear_database()
    clear_r2()

    print("\n" + "=" * 50)
    print("✅ Đã xóa toàn bộ dữ liệu thành công!")
    print("=" * 50)


if __name__ == "__main__":
    asyncio.run(main())
