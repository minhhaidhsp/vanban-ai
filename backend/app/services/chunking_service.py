"""
Chunking service for Vietnamese administrative documents.

Priority:
  1. Split on structural markers: Điều / Khoản / Mục
  2. Fallback: sliding window (~512 tokens, 64-token overlap)

Each chunk is prepended with a context line so that the embedding carries
document identity even for short passages:
  [{so_ki_hieu}] [{co_quan_ban_hanh}] {heading}: {body}
"""
import re
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# ── Heuristic: Vietnamese averages ~4 chars/token ──────────────────────────
CHARS_PER_TOKEN = 4
WINDOW_TOKENS = 512
OVERLAP_TOKENS = 64
MAX_CHUNK_TOKENS = 1024

WINDOW_CHARS = WINDOW_TOKENS * CHARS_PER_TOKEN      # 2048
OVERLAP_CHARS = OVERLAP_TOKENS * CHARS_PER_TOKEN    # 256
MAX_CHUNK_CHARS = MAX_CHUNK_TOKENS * CHARS_PER_TOKEN  # 4096

# ── Structural patterns ────────────────────────────────────────────────────
_DIEU  = re.compile(r'(?:^|\n)(Điều\s+\d+[\.:]?[^\n]*)', re.MULTILINE)
_KHOAN = re.compile(r'(?:^|\n)(\d+\.\s)', re.MULTILINE)
_MUC   = re.compile(r'(?:^|\n)(Mục\s+[IVXivx0-9]+[\.:]?[^\n]*)', re.MULTILINE)


def _approx_tokens(text: str) -> int:
    return len(text) // CHARS_PER_TOKEN


def _build_context_prefix(metadata: dict) -> str:
    so = metadata.get("so_ki_hieu", "")
    cq = metadata.get("co_quan_ban_hanh", "")
    parts = [f"[{so}]" if so else "", f"[{cq}]" if cq else ""]
    return " ".join(p for p in parts if p)


def _sliding_window(text: str, prefix: str, heading: str) -> list[dict]:
    """Split text into overlapping windows when no structure is found."""
    chunks = []
    start = 0
    idx = 0
    while start < len(text):
        end = min(start + WINDOW_CHARS, len(text))
        body = text[start:end].strip()
        if body:
            context = f"{prefix} {heading}: {body}".strip() if prefix or heading else body
            chunks.append({
                "chunk_index": idx,
                "content": context,
                "dieu_khoan": heading or "—",
                "token_count": _approx_tokens(context),
            })
            idx += 1
        start = end - OVERLAP_CHARS
        if start < 0:
            start = 0
        if end >= len(text):
            break
    return chunks


def _split_by_pattern(text: str, pattern: re.Pattern) -> list[tuple[str, str]]:
    """Return list of (heading, body) pairs split by pattern."""
    matches = list(pattern.finditer(text))
    if not matches:
        return []

    sections: list[tuple[str, str]] = []
    # Text before first heading (may be preamble)
    preamble = text[: matches[0].start()].strip()
    if preamble:
        sections.append(("—", preamble))

    for i, m in enumerate(matches):
        heading = m.group(1).strip()
        body_start = m.end()
        body_end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        body = text[body_start:body_end].strip()
        sections.append((heading, body))

    return sections


def chunk_document(content: str, metadata: Optional[dict] = None) -> list[dict]:
    """
    Chunk a document using Vietnamese legal structure if present,
    otherwise use sliding window.

    Args:
        content:  Full extracted text.
        metadata: Dict with keys so_ki_hieu, co_quan_ban_hanh.

    Returns:
        List of chunk dicts: {chunk_index, content, dieu_khoan, token_count}
    """
    if metadata is None:
        metadata = {}

    prefix = _build_context_prefix(metadata)
    content = content.strip()

    if not content:
        return []

    chunks: list[dict] = []
    idx = 0

    # ── 1. Try to split by Điều (articles) first ───────────────────────────
    sections = _split_by_pattern(content, _DIEU)

    # Fall back to Mục if no Điều found
    if not sections:
        sections = _split_by_pattern(content, _MUC)

    # Fall back to sliding window if no structure at all
    if not sections:
        logger.debug("No structure detected — using sliding window")
        return _sliding_window(content, prefix, "")

    # ── 2. Process each section ────────────────────────────────────────────
    for heading, body in sections:
        if not body:
            continue

        if len(body) <= MAX_CHUNK_CHARS:
            context = f"{prefix} {heading}: {body}".strip() if prefix else f"{heading}: {body}".strip()
            chunks.append({
                "chunk_index": idx,
                "content": context,
                "dieu_khoan": heading,
                "token_count": _approx_tokens(context),
            })
            idx += 1
        else:
            # Section too long — sub-split by Khoản
            sub_sections = _split_by_pattern(body, _KHOAN)
            if sub_sections:
                for sub_heading, sub_body in sub_sections:
                    if not sub_body:
                        continue
                    full_heading = f"{heading} / {sub_heading}".strip(" /")
                    context = f"{prefix} {full_heading}: {sub_body}".strip() if prefix else f"{full_heading}: {sub_body}".strip()
                    for win in _sliding_window(sub_body, prefix, full_heading):
                        win["chunk_index"] = idx
                        win["dieu_khoan"] = full_heading
                        chunks.append(win)
                        idx += 1
            else:
                # Khoản also absent — sliding window on section body
                for win in _sliding_window(body, prefix, heading):
                    win["chunk_index"] = idx
                    win["dieu_khoan"] = heading
                    chunks.append(win)
                    idx += 1

    logger.debug(
        f"chunk_document: {len(chunks)} chunks  "
        f"prefix='{prefix[:40]}'  total_chars={len(content)}"
    )
    return chunks
