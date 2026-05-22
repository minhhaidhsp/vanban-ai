"""
Embedding service — BAAI/bge-m3 loaded eagerly at module import.

The model is loaded once into a module-level singleton so every worker
shares the same weights.  Load time is logged; subsequent calls are fast.
"""
import logging
import time
from typing import Optional

logger = logging.getLogger(__name__)

MODEL_NAME = "BAAI/bge-m3"
EMBEDDING_DIM = 1024
# bge-m3 native max is 8192 — sentence-transformers truncates automatically
MAX_SEQ_LENGTH = 8192

# ── Eager load ─────────────────────────────────────────────────────────────
_model = None
_load_error: Optional[str] = None

try:
    from sentence_transformers import SentenceTransformer

    logger.info(f"Loading {MODEL_NAME} …")
    _t0 = time.time()
    _model = SentenceTransformer(MODEL_NAME)
    _model.max_seq_length = MAX_SEQ_LENGTH
    elapsed = time.time() - _t0
    logger.info(f"✓ {MODEL_NAME} loaded in {elapsed:.1f}s  (dim={EMBEDDING_DIM})")
except Exception as exc:
    _load_error = str(exc)
    logger.error(f"✗ Failed to load {MODEL_NAME}: {exc}")


# ── Public API ──────────────────────────────────────────────────────────────

def is_available() -> bool:
    return _model is not None


def embed_text(text: str) -> list[float]:
    """Embed a single string.  Raises RuntimeError if model failed to load."""
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
    """Embed a list of strings.  Returns list of float vectors."""
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
