"""
Embedding service — BAAI/bge-m3 lazy-loaded on first use.

Model is NOT loaded at import time to avoid OOM on memory-constrained
hosts (Railway free tier). First call to embed_text/embed_batch triggers
the load; subsequent calls reuse the cached singleton.
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
_lock = threading.Lock()


def _load_model():
    global _model, _load_error
    if _model is not None:
        return
    with _lock:
        if _model is not None:
            return
        try:
            from sentence_transformers import SentenceTransformer
            logger.info(f"[embedding] lazy-loading {MODEL_NAME} …")
            t0 = time.time()
            m = SentenceTransformer(MODEL_NAME)
            m.max_seq_length = MAX_SEQ_LENGTH
            _model = m
            logger.info(f"[embedding] {MODEL_NAME} loaded in {time.time()-t0:.1f}s (dim={EMBEDDING_DIM})")
        except Exception as exc:
            _load_error = str(exc)
            logger.error(f"[embedding] failed to load {MODEL_NAME}: {exc}")


# ── Public API ──────────────────────────────────────────────────────────────

def is_available() -> bool:
    return _model is not None or _load_error is None


def embed_text(text: str) -> list[float]:
    """Embed a single string. Triggers model load on first call."""
    _load_model()
    if _model is None:
        raise RuntimeError(f"Embedding model unavailable: {_load_error}")

    t0 = time.time()
    vector = _model.encode(
        text,
        normalize_embeddings=True,
        show_progress_bar=False,
    )
    logger.debug(f"embed_text  len={len(text)}  t={time.time()-t0:.3f}s")
    return vector.tolist()


def embed_batch(texts: list[str]) -> list[list[float]]:
    """Embed a list of strings. Triggers model load on first call."""
    _load_model()
    if _model is None:
        raise RuntimeError(f"Embedding model unavailable: {_load_error}")
    if not texts:
        return []

    t0 = time.time()
    vectors = _model.encode(
        texts,
        batch_size=8,
        normalize_embeddings=True,
        show_progress_bar=False,
    )
    elapsed = time.time() - t0
    logger.info(
        f"embed_batch  n={len(texts)}  "
        f"avg_len={sum(len(t) for t in texts)//len(texts)}chars  "
        f"t={elapsed:.2f}s"
    )
    return [v.tolist() for v in vectors]
