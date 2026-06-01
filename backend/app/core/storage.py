"""
Storage service — Cloudflare R2 (production) or MinIO (local dev).

Uses boto3 S3-compatible client for both backends.
Production: set R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY in env.
Local dev:  falls back to MinIO settings (MINIO_*) when R2_ENDPOINT is empty.
"""
import io
import logging

import boto3
from botocore.config import Config

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


def get_storage_client():
    """Return a boto3 S3 client pointed at R2 (prod) or MinIO (local).

    Must use path-style addressing — both R2 and MinIO require it.
    Virtual-hosted style (default) prepends bucket as subdomain which fails.
    """
    _path_style = Config(
        signature_version="s3v4",
        s3={"addressing_style": "path"},
    )
    if settings.r2_endpoint:
        endpoint = settings.r2_endpoint
        if not endpoint.startswith("http"):
            endpoint = f"https://{endpoint}"
        return boto3.client(
            "s3",
            endpoint_url=endpoint,
            aws_access_key_id=settings.r2_access_key_id,
            aws_secret_access_key=settings.r2_secret_access_key,
            config=_path_style,
            region_name="auto",
        )
    # Local dev: MinIO via S3-compatible API
    scheme = "https" if settings.minio_use_ssl else "http"
    return boto3.client(
        "s3",
        endpoint_url=f"{scheme}://{settings.minio_endpoint}",
        aws_access_key_id=settings.minio_access_key,
        aws_secret_access_key=settings.minio_secret_key,
        config=_path_style,
        region_name="us-east-1",
    )


def _default_bucket() -> str:
    return settings.r2_bucket_name if settings.r2_endpoint else settings.minio_bucket_name


# Keep old name as alias — callers that import get_minio_client still work.
get_minio_client = get_storage_client


def ensure_bucket_exists(client, bucket_name: str) -> None:
    """No-op for R2 (buckets pre-created in dashboard). Creates bucket for local MinIO."""
    if settings.r2_endpoint:
        return
    try:
        client.head_bucket(Bucket=bucket_name)
    except Exception:
        try:
            client.create_bucket(Bucket=bucket_name)
        except Exception as exc:
            logger.warning("[storage] could not create bucket %s: %s", bucket_name, exc)


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
    """Blocking download — call via asyncio.to_thread from async context."""
    bucket = bucket_name or _default_bucket()
    client = get_storage_client()
    response = client.get_object(Bucket=bucket, Key=object_name)
    return response["Body"].read()


def delete_file(object_name: str, bucket_name: str | None = None) -> None:
    """Blocking delete — call via asyncio.to_thread from async context."""
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
