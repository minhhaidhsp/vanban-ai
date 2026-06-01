"""
Storage service — Cloudflare R2 via boto3 S3-compatible client.

Required env vars: R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME
"""
import logging

import boto3
from botocore.config import Config

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

_S3_CONFIG = Config(
    signature_version="s3v4",
    s3={"addressing_style": "path"},  # R2 requires path-style, not virtual-hosted
)


def get_storage_client():
    endpoint = settings.r2_endpoint
    if not endpoint.startswith("http"):
        endpoint = f"https://{endpoint}"

    logger.info("[storage] endpoint: %s", endpoint)
    logger.info("[storage] access_key_id: %s",
                (settings.r2_access_key_id[:8] + "...") if settings.r2_access_key_id else "MISSING")
    logger.info("[storage] secret_key set: %s", bool(settings.r2_secret_access_key))
    logger.info("[storage] bucket: %s", settings.r2_bucket_name)

    return boto3.client(
        "s3",
        endpoint_url=endpoint,
        aws_access_key_id=settings.r2_access_key_id,
        aws_secret_access_key=settings.r2_secret_access_key,
        config=_S3_CONFIG,
        region_name="auto",
    )


# Backward-compat alias
get_minio_client = get_storage_client


def _default_bucket() -> str:
    return settings.r2_bucket_name


def ensure_bucket_exists(client, bucket_name: str) -> None:
    """No-op — R2 buckets are pre-created in the dashboard."""
    pass


async def upload_file(
    file_data: bytes,
    object_name: str,
    content_type: str = "application/octet-stream",
    bucket_name: str | None = None,
) -> str:
    import asyncio
    bucket = bucket_name or _default_bucket()

    def _put():
        client = get_storage_client()
        client.put_object(
            Bucket=bucket,
            Key=object_name,
            Body=file_data,
            ContentType=content_type,
        )

    await asyncio.to_thread(_put)
    return object_name


def download_file(object_name: str, bucket_name: str | None = None) -> bytes:
    """Blocking — call via asyncio.to_thread."""
    bucket = bucket_name or _default_bucket()
    client = get_storage_client()
    response = client.get_object(Bucket=bucket, Key=object_name)
    return response["Body"].read()


def delete_file(object_name: str, bucket_name: str | None = None) -> None:
    """Blocking — call via asyncio.to_thread."""
    bucket = bucket_name or _default_bucket()
    client = get_storage_client()
    client.delete_object(Bucket=bucket, Key=object_name)


def get_file_url(object_name: str, expires_seconds: int = 3600, bucket_name: str | None = None) -> str:
    bucket = bucket_name or _default_bucket()
    client = get_storage_client()
    return client.generate_presigned_url(
        "get_object",
        Params={"Bucket": bucket, "Key": object_name},
        ExpiresIn=expires_seconds,
    )
