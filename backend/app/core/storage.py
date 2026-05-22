from minio import Minio
from minio.error import S3Error
from app.core.config import get_settings
import io

settings = get_settings()


def get_minio_client() -> Minio:
    return Minio(
        endpoint=settings.minio_endpoint,
        access_key=settings.minio_access_key,
        secret_key=settings.minio_secret_key,
        secure=settings.minio_use_ssl,
    )


def ensure_bucket_exists(client: Minio, bucket_name: str) -> None:
    if not client.bucket_exists(bucket_name):
        client.make_bucket(bucket_name)


async def upload_file(
    file_data: bytes,
    object_name: str,
    content_type: str = "application/octet-stream",
    bucket_name: str | None = None,
) -> str:
    client = get_minio_client()
    bucket = bucket_name or settings.minio_bucket_name
    ensure_bucket_exists(client, bucket)

    client.put_object(
        bucket_name=bucket,
        object_name=object_name,
        data=io.BytesIO(file_data),
        length=len(file_data),
        content_type=content_type,
    )
    return object_name


def get_file_url(object_name: str, expires_seconds: int = 3600, bucket_name: str | None = None) -> str:
    from datetime import timedelta

    client = get_minio_client()
    return client.presigned_get_object(
        bucket_name=bucket_name or settings.minio_bucket_name,
        object_name=object_name,
        expires=timedelta(seconds=expires_seconds),
    )
