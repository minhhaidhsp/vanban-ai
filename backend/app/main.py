import asyncio
import logging
import os
import sys
import time

# ── Bootstrap logging immediately so every subsequent import is visible ───────
# uvicorn replaces handlers later, but this ensures module-level code in
# database.py, config.py, etc. can emit logs before uvicorn starts.
logging.basicConfig(
    level=logging.DEBUG if os.getenv("DEBUG", "").lower() == "true" else logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s — %(message)s",
    stream=sys.stdout,
    force=True,
)
logger = logging.getLogger(__name__)

logger.info("[startup] Python %s — main.py loading", sys.version.split()[0])
logger.info("[startup] cwd=%s", os.getcwd())

# ── Step 1: settings ──────────────────────────────────────────────────────────
logger.info("[startup] importing settings …")
try:
    from app.core.config import get_settings
    settings = get_settings()
    logger.info("[startup] settings loaded — app_name=%r debug=%s", settings.app_name, settings.debug)
except Exception as e:
    logger.error("[startup] FAILED to load settings: %s", e, exc_info=True)
    raise

# ── Step 2: FastAPI + contextlib ──────────────────────────────────────────────
logger.info("[startup] importing FastAPI …")
try:
    from fastapi import FastAPI
    from fastapi.middleware.cors import CORSMiddleware
    from fastapi.responses import JSONResponse
    from contextlib import asynccontextmanager
    logger.info("[startup] FastAPI imported OK")
except Exception as e:
    logger.error("[startup] FAILED to import FastAPI: %s", e, exc_info=True)
    raise

# ── Step 3: internal core modules ─────────────────────────────────────────────
logger.info("[startup] importing app.core.redis …")
try:
    from app.core.redis import close_redis
    logger.info("[startup] app.core.redis imported OK")
except Exception as e:
    logger.error("[startup] FAILED to import app.core.redis: %s", e, exc_info=True)
    raise

# ── Step 4: API router (triggers all endpoint + service imports) ───────────────
logger.info("[startup] importing api_router (all endpoints) …")
_t0 = time.monotonic()
try:
    from app.api.v1.router import api_router
    logger.info("[startup] api_router imported OK in %.2fs", time.monotonic() - _t0)
except Exception as e:
    logger.error("[startup] FAILED to import api_router: %s", e, exc_info=True)
    raise

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

    logger.info("[startup] beginning model loading in background thread …")
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, _do_load_all_models)
    _models_ready = True
    logger.info("[startup] all models ready — serving full traffic")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("[startup] lifespan begin — spawning model-load task")
    # Fire-and-forget: lifespan yields immediately so /health responds at once.
    asyncio.create_task(_load_models())
    logger.info("[startup] lifespan yielding — server is accepting requests")
    yield
    logger.info("[shutdown] lifespan teardown — closing Redis")
    await close_redis()
    logger.info("[shutdown] Redis closed — goodbye")


logger.info("[startup] creating FastAPI app instance …")
app = FastAPI(
    title=settings.app_name,
    openapi_url="/api/v1/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)
logger.info("[startup] FastAPI app created OK")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
logger.info("[startup] CORS middleware added")

app.include_router(api_router, prefix="/api/v1")
logger.info("[startup] routers registered — module load complete")


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
