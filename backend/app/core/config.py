from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # App
    app_name: str = "VănBản.AI"
    debug: bool = False
    secret_key: str = "change-this-in-production"
    allowed_origins: list[str] = ["http://localhost:3000"]

    # JWT
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

    # Database
    database_url: str = "postgresql://postgres:password@localhost:5432/vanban_ai"

    # Redis
    redis_url: str = "redis://localhost:6379"

    # MinIO
    minio_endpoint: str = "localhost:9000"
    minio_access_key: str = "minioadmin"
    minio_secret_key: str = "minioadmin"
    minio_bucket_name: str = "vanban-ai"
    minio_use_ssl: bool = False


@lru_cache
def get_settings() -> Settings:
    return Settings()
