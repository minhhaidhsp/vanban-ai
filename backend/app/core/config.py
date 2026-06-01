from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore",
        populate_by_name=True,
    )

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

    # MinIO (local dev only)
    minio_endpoint: str = "localhost:9000"
    minio_access_key: str = "minioadmin"
    minio_secret_key: str = "minioadmin"
    minio_bucket_name: str = "vanban-ai"
    minio_use_ssl: bool = False

    # Cloudflare R2 — mapped from MINIO_* Railway env vars so no Railway changes needed
    r2_endpoint: str = Field(default="", alias="MINIO_ENDPOINT")
    r2_access_key_id: str = Field(default="", alias="MINIO_ACCESS_KEY")
    r2_secret_access_key: str = Field(default="", alias="MINIO_SECRET_KEY")
    r2_bucket_name: str = Field(default="vanban-ai", alias="MINIO_BUCKET_NAME")

    # LLM (vLLM / OpenAI-compatible)
    llm_base_url: str = ""
    llm_api_key: str = ""
    llm_model_name: str = "Qwen/Qwen2.5-3B-Instruct"
    llm_timeout: int = 60
    llm_max_retries: int = 3
    llm_temperature: float = 0.1
    llm_max_tokens: int = 2048

    # Batch upload
    upload_max_files: int = 20
    upload_timeout_seconds: int = 300
    doc_job_ttl_seconds: int = 86400  # 24h


@lru_cache
def get_settings() -> Settings:
    return Settings()
