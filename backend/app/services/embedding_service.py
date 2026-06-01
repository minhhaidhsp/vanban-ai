"""
Embedding service — BAAI/bge-m3 loaded in background at startup.

Model is NOT loaded at import time. main.py lifespan spawns a background
task that calls load_in_background(). Endpoints check is_ready() and
return 503 while the model is still loading.
"""
import logging
import time
import threading
from typing import Optional

logger = logging.getLogger(__name__)

MODEL_NAME = "BAAI/bge-m3"
EMBEDDING_DIM = 1024
MAX_SEQ_LENGTH = 8192

_model = None
_load_error: Optional[str] = None
_loading = False
_lock = threading.Lock()


def is_ready() -> bool:
    """True only when model is fully loaded and usable."""
    return _model is not None


def is_available() -> bool:
    """Alias kept for backward compatibility — same as is_ready()."""
    return _model is not None


def _load_model():
    """Blocking load — must be called via asyncio.to_thread."""
    global _model, _load_error, _loading
    if _model is not None:
        return
    with _lock:
        if _model is not None:
            return
        _loading = True
        try:
            from sentence_transformers import SentenceTransformer
            logger.info("[embedding] loading %s …", MODEL_NAME)
            t0 = time.time()
            m = SentenceTransformer(MODEL_NAME)
            m.max_seq_length = MAX_SEQ_LENGTH
            _model = m
            logger.info("[embedding] %s ready in %.1fs (dim=%d)", MODEL_NAME, time.time() - t0, EMBEDDING_DIM)
        except Exception as exc:
            _load_error = str(exc)
            logger.error("[embedding] failed to load %s: %s", MODEL_NAME, exc)
        finally:
            _loading = False


async def load_in_background():
    """Async entry point — call once from lifespan via asyncio.create_task."""
    import asyncio
    await asyncio.to_thread(_load_model)


# ── Public API ──────────────────────────────────────────────────────────────

def embed_text(text: str) -> list[float]:
    """Embed a single string. Raises RuntimeError if model not ready."""
    if _model is None:
        raise RuntimeError("Embedding model not ready yet")

    t0 = time.time()
    vector = _model.encode(text, normalize_embeddings=True, show_progress_bar=False)
    logger.debug("embed_text len=%d t=%.3fs", len(text), time.time() - t0)
    return vector.tolist()


def embed_batch(texts: list[str]) -> list[list[float]]:
    """Embed a list of strings. Raises RuntimeError if model not ready."""
    if _model is None:
        raise RuntimeError("Embedding model not ready yet")
    if not texts:
        return []

    t0 = time.time()
    vectors = _model.encode(texts, batch_size=8, normalize_embeddings=True, show_progress_bar=False)
    elapsed = time.time() - t0
    logger.info("embed_batch n=%d avg_len=%dchars t=%.2fs",
                len(texts), sum(len(t) for t in texts) // len(texts), elapsed)
    return [v.tolist() for v in vectors]
