import asyncio
import logging
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from app.core.config import get_settings
from app.core.redis import close_redis
from app.api.v1.router import api_router

settings = get_settings()
logger = logging.getLogger(__name__)

# Global flag — set True only after both models are fully loaded.
# Also set True immediately when SKIP_MODEL_LOADING=true so /ready returns 200.
_models_ready: bool = False


def _do_load_all_models() -> None:
    """
    Synchronous — runs in thread pool via run_in_executor so the event loop
    stays free to handle /health and other requests while loading.

    391 weights = BAAI/bge-m3 (embedding)
    105 weights = cross-encoder/ms-marco-MiniLM-L-6-v2 (reranker)
    """
    # Model 1: BAAI/bge-m3
    try:
        from app.services.embedding_service import _load_model
        _load_model()
    except Exception as exc:
        logger.warning("[startup] bge-m3 load failed (non-fatal): %s", exc)

    # Model 2: CrossEncoder reranker
    try:
        from app.services.rag_service import _get_reranker
        _get_reranker()
        logger.info("[startup] reranker ready")
    except Exception as exc:
        logger.warning("[startup] reranker load failed (non-fatal): %s", exc)


async def _load_models() -> None:
    global _models_ready

    if os.getenv("SKIP_MODEL_LOADING", "").lower() == "true":
        logger.info("[startup] SKIP_MODEL_LOADING=true — skipping model loading")
        _models_ready = True
        return

    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, _do_load_all_models)
    _models_ready = True
    logger.info("[startup] all models ready — serving full traffic")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Fire-and-forget: lifespan yields immediately so /health responds at once.
    asyncio.create_task(_load_models())
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
    """Always 200 — no model/DB dependency."""
    return {"status": "ok", "app": settings.app_name}


@app.get("/ready")
async def ready():
    """Returns 200 when both models are loaded, 503 while still loading."""
    if _models_ready:
        return {"status": "ready"}
    return JSONResponse(status_code=503, content={"status": "loading"})
