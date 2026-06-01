import asyncio
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.core.config import get_settings
from app.core.redis import close_redis
from app.api.v1.router import api_router

settings = get_settings()
logger = logging.getLogger(__name__)


async def _background_startup():
    """Load heavy models after app is up so /health responds immediately."""
    # 1. Load embedding model (BAAI/bge-m3 ~1.5 GB)
    try:
        from app.services.embedding_service import load_in_background
        await load_in_background()
    except Exception as exc:
        logger.warning("[startup] embedding load failed (non-fatal): %s", exc)

    # 2. Warm up CrossEncoder reranker (~70 MB)
    try:
        from app.services.rag_service import warm_up_reranker
        await warm_up_reranker()
        logger.info("[startup] reranker ready")
    except Exception as exc:
        logger.warning("[startup] reranker warm-up failed (non-fatal): %s", exc)

    # Storage buckets are pre-created on R2/MinIO dashboard — no init needed at startup.


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Fire-and-forget: app accepts requests (including /health) immediately.
    asyncio.create_task(_background_startup())
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
    """Always returns 200 immediately — no model/DB checks."""
    return {"status": "ok", "app": settings.app_name}
