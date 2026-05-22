from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.core.config import get_settings
from app.core.redis import close_redis
from app.api.v1.router import api_router

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # MinIO buckets
    from app.core.storage import get_minio_client, ensure_bucket_exists
    try:
        client = get_minio_client()
        ensure_bucket_exists(client, settings.minio_bucket_name)
        ensure_bucket_exists(client, "reference-docs")
    except Exception:
        pass

    # Eager-load embedding model in a thread so the event loop isn't blocked
    import asyncio
    import logging
    logger = logging.getLogger(__name__)
    try:
        import app.services.embedding_service as _emb  # noqa: F401 — triggers module-level load
        logger.info("Embedding service ready: available=%s", _emb.is_available())
    except Exception as exc:
        logger.warning("Embedding service failed to load: %s", exc)

    yield
    await close_redis()


app = FastAPI(
    title=settings.app_name,
    openapi_url="/api/v1/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")


@app.get("/health")
async def health_check():
    return {"status": "ok", "app": settings.app_name}
