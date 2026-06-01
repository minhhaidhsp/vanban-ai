"""
Storage service — factory pattern supporting MinIO (local dev) and Cloudflare R2 (production).

Switch via STORAGE_BACKEND env var:
  STORAGE_BACKEND=minio  → MinIO SDK (default, local dev)
  STORAGE_BACKEND=r2     → boto3 S3-compatible (production)
"""
import asyncio
import logging
from io import BytesIO

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


# ── Client factory ────────────────────────────────────────────────────────────

def get_storage_client():
    if settings.storage_backend == "r2":
        import boto3
        from botocore.config import Config
        endpoint = settings.r2_endpoint
        if not endpoint.startswith("http"):
            endpoint = f"https://{endpoint}"
        logger.info("[storage] R2 endpoint=%s bucket=%s", endpoint, settings.r2_bucket_name)
        return boto3.client(
            "s3",
            endpoint_url=endpoint,
            aws_access_key_id=settings.r2_access_key_id,
            aws_secret_access_key=settings.r2_secret_access_key,
            config=Config(signature_version="s3v4", s3={"addressing_style": "path"}),
            region_name="auto",
        )
    else:
        from minio import Minio
        logger.info("[storage] MinIO endpoint=%s bucket=%s", settings.minio_endpoint, settings.minio_bucket_name)
        return Minio(
            settings.minio_endpoint,
            access_key=settings.minio_access_key,
            secret_key=settings.minio_secret_key,
            secure=settings.minio_use_ssl,
        )


# Backward-compat alias
get_minio_client = get_storage_client


def get_bucket_name(bucket_name: str | None = None) -> str:
    if bucket_name:
        return bucket_name
    return settings.r2_bucket_name if settings.storage_backend == "r2" else settings.minio_bucket_name


# ── Low-level ops (backend-aware) ─────────────────────────────────────────────

def upload_file_data(client, bucket: str, key: str, data: bytes, content_type: str) -> None:
    if settings.storage_backend == "r2":
        client.put_object(Bucket=bucket, Key=key, Body=data, ContentType=content_type)
    else:
        client.put_object(bucket, key, BytesIO(data), len(data), content_type=content_type)


def download_file_data(client, bucket: str, key: str) -> bytes:
    if settings.storage_backend == "r2":
        return client.get_object(Bucket=bucket, Key=key)["Body"].read()
    else:
        response = client.get_object(bucket, key)
        try:
            return response.read()
        finally:
            response.close()
            response.release_conn()


def delete_file_data(client, bucket: str, key: str) -> None:
    if settings.storage_backend == "r2":
        client.delete_object(Bucket=bucket, Key=key)
    else:
        client.remove_object(bucket, key)


def ensure_bucket_exists(client, bucket_name: str) -> None:
    if settings.storage_backend == "r2":
        return  # R2 buckets pre-created in dashboard
    try:
        if not client.bucket_exists(bucket_name):
            client.make_bucket(bucket_name)
    except Exception as exc:
        logger.warning("[storage] could not ensure bucket %s: %s", bucket_name, exc)


# ── High-level async wrappers ─────────────────────────────────────────────────

async def upload_file(
    file_data: bytes,
    object_name: str,
    content_type: str = "application/octet-stream",
    bucket_name: str | None = None,
) -> str:
    bucket = get_bucket_name(bucket_name)

    def _put():
        client = get_storage_client()
        ensure_bucket_exists(client, bucket)
        upload_file_data(client, bucket, object_name, file_data, content_type)

    await asyncio.to_thread(_put)
    return object_name


def download_file(object_name: str, bucket_name: str | None = None) -> bytes:
    """Blocking — call via asyncio.to_thread from async context."""
    bucket = get_bucket_name(bucket_name)
    client = get_storage_client()
    return download_file_data(client, bucket, object_name)


def delete_file(object_name: str, bucket_name: str | None = None) -> None:
    """Blocking — call via asyncio.to_thread from async context."""
    bucket = get_bucket_name(bucket_name)
    client = get_storage_client()
    delete_file_data(client, bucket, object_name)


def get_file_url(object_name: str, expires_seconds: int = 3600, bucket_name: str | None = None) -> str:
    bucket = get_bucket_name(bucket_name)
    client = get_storage_client()
    if settings.storage_backend == "r2":
        return client.generate_presigned_url(
            "get_object",
            Params={"Bucket": bucket, "Key": object_name},
            ExpiresIn=expires_seconds,
        )
    else:
        from datetime import timedelta
        return client.presigned_get_object(bucket, object_name, expires=timedelta(seconds=expires_seconds))
