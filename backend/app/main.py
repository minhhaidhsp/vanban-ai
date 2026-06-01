from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.core.config import get_settings
from app.core.redis import close_redis
from app.api.v1.router import api_router

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    import asyncio
    import logging
    logger = logging.getLogger(__name__)

    # MinIO buckets — best-effort, must not block startup
    async def _init_minio():
        from app.core.storage import get_minio_client, ensure_bucket_exists
        try:
            client = get_minio_client()
            ensure_bucket_exists(client, settings.minio_bucket_name)
            ensure_bucket_exists(client, "reference-docs")
        except Exception as exc:
            logger.warning("MinIO init failed (non-fatal): %s", exc)

    # Warm-up tasks run in background so healthcheck responds immediately
    async def _background_warmup():
        try:
            from app.services.rag_service import warm_up_reranker
            await warm_up_reranker()
            logger.info("Reranker warm-up complete")
        except Exception as exc:
            logger.warning("Reranker warm-up failed (non-fatal): %s", exc)

    asyncio.create_task(_init_minio())
    asyncio.create_task(_background_warmup())

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
