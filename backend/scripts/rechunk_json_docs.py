"""
Rechunk large reference_doc_chunks from JSON import:
- Strip dichvucong table-format boilerplate
- Split into 800-1600 char sub-chunks on sentence boundaries
- Re-embed each new chunk

Usage:
  python backend/scripts/rechunk_json_docs.py [--dry-run]
"""
import sys, re, asyncio, argparse
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

# ── Boilerplate patterns to strip ────────────────────────────────────────────

# Remove dichvucong table column references after content
_INLINE_LINK = re.compile(
    r'\s*\|\s*\[]\(https?://[^\)]*\)\s*\|\s*Bản chính:\s*\d+\s*-\s*Bản sao:\s*\d+',
    re.IGNORECASE
)
# Table header row
_TABLE_HEADER = re.compile(
    r'Tên giấy tờ\s*\|\s*Mẫu đơn[^\n]*\n?', re.IGNORECASE
)
# Table separator
_TABLE_SEP = re.compile(r'^-{3,}\|[-|]+\n?', re.MULTILINE)
# Empty "Bản chính: 0" lines (after stripping inline links)
_BAN_CHINH_ZERO = re.compile(r'Bản chính:\s*0\s*-\s*Bản sao:\s*0\s*', re.IGNORECASE)
# Escaped markdown list markers → real line breaks
_ESCAPED_DASH = re.compile(r'\\[-•]')
_ESCAPED_PLUS = re.compile(r'\\\+')
# Collapse excessive whitespace
_MULTI_SPACE = re.compile(r' {2,}')
_MULTI_NEWLINE = re.compile(r'\n{3,}')


def strip_boilerplate(text: str) -> str:
    text = _TABLE_HEADER.sub('', text)
    text = _TABLE_SEP.sub('', text)
    text = _INLINE_LINK.sub('', text)
    text = _BAN_CHINH_ZERO.sub('', text)
    # Convert escaped markdown markers to line breaks
    text = _ESCAPED_DASH.sub('\n-', text)
    text = _ESCAPED_PLUS.sub('\n+', text)
    text = _MULTI_SPACE.sub(' ', text)
    text = _MULTI_NEWLINE.sub('\n\n', text)
    return text.strip()


def split_into_chunks(text: str, target: int = 1200, overlap: int = 150) -> list[str]:
    """
    Split text into chunks of ~target chars, splitting on sentence/line
    boundaries. Adjacent chunks share `overlap` chars.
    """
    if len(text) <= target:
        return [text] if text.strip() else []

    chunks = []
    # Split on paragraph breaks first (double newline)
    paragraphs = [p.strip() for p in re.split(r'\n\n+', text) if p.strip()]

    current = ""
    for para in paragraphs:
        if not current:
            current = para
        elif len(current) + len(para) + 2 <= target:
            current += "\n\n" + para
        else:
            # Flush current
            if current.strip():
                chunks.append(current.strip())
            # Overlap: carry last sentence(s) of current into next
            tail = ""
            if overlap > 0:
                sentences = re.split(r'(?<=[.!?…])\s+', current)
                tail_chars = 0
                tail_parts = []
                for s in reversed(sentences):
                    if tail_chars + len(s) <= overlap:
                        tail_parts.insert(0, s)
                        tail_chars += len(s)
                    else:
                        break
                tail = " ".join(tail_parts)
            current = (tail + "\n\n" + para).strip() if tail else para

    if current.strip():
        chunks.append(current.strip())

    # If any chunk is still too large, further split on single newlines
    final = []
    for chunk in chunks:
        if len(chunk) <= target * 1.5:
            final.append(chunk)
        else:
            # Last resort: split on newlines
            lines = [l.strip() for l in chunk.split('\n') if l.strip()]
            sub = ""
            for line in lines:
                if not sub:
                    sub = line
                elif len(sub) + len(line) + 1 <= target:
                    sub += "\n" + line
                else:
                    if sub.strip():
                        final.append(sub.strip())
                    sub = line
            if sub.strip():
                final.append(sub.strip())

    return [c for c in final if c.strip()]


async def main(dry_run: bool) -> None:
    from app.core.database import AsyncSessionLocal
    from app.models.reference_document import ReferenceDocument
    from app.models.reference_doc_chunk import ReferenceDocChunk
    from app.services import embedding_service
    from sqlalchemy import select, delete
    import uuid

    # Load model if needed
    if not embedding_service.is_available():
        print("Loading embedding model...")
        await asyncio.to_thread(embedding_service._load_model)
        if not embedding_service.is_available():
            print("ERROR: Failed to load embedding model"); sys.exit(1)
        print("Model ready ✅")

    # Fetch all chunks from JSON-imported docs
    async with AsyncSessionLocal() as db:
        rows = (await db.execute(
            select(
                ReferenceDocChunk.id,
                ReferenceDocChunk.content,
                ReferenceDocChunk.dieu_khoan,
                ReferenceDocChunk.chunk_index,
                ReferenceDocChunk.document_id,
                ReferenceDocument.title,
                ReferenceDocument.so_ki_hieu,
            )
            .join(ReferenceDocument, ReferenceDocChunk.document_id == ReferenceDocument.id)
            .where(
                ReferenceDocument.visibility == "system",
                (ReferenceDocument.so_ki_hieu.like("1.%") |
                 ReferenceDocument.so_ki_hieu.like("2.%"))
            )
        )).all()

    print(f"\nFetched {len(rows)} chunks from 18 JSON-imported docs")

    large = [r for r in rows if len(r.content) > 500]
    small = [r for r in rows if len(r.content) <= 500]
    print(f"  Large (>500 chars): {len(large)} — will rechunk")
    print(f"  Small (≤500 chars): {len(small)} — keep as-is")

    if dry_run:
        print("\n=== DRY RUN ===")
        total_before = len(large)
        total_after = 0
        for row in large[:15]:  # show first 15
            cleaned = strip_boilerplate(row.content)
            sub_chunks = split_into_chunks(cleaned)
            total_after += len(sub_chunks)
            sizes = [len(c) for c in sub_chunks]
            print(f"\n[{row.so_ki_hieu}] {row.title[:50]}")
            print(f"  dieu_khoan: {row.dieu_khoan}")
            print(f"  {len(row.content)} chars → {len(sub_chunks)} sub-chunks {sizes}")
            if sub_chunks:
                print(f"  preview[0]: {sub_chunks[0][:150]}...")
        # Estimate for remaining
        for row in large[15:]:
            cleaned = strip_boilerplate(row.content)
            sub_chunks = split_into_chunks(cleaned)
            total_after += len(sub_chunks)
        print(f"\nSummary:")
        print(f"  Large chunks: {total_before}")
        print(f"  After rechunk: {total_after} chunks (from large only)")
        print(f"  Small unchanged: {len(small)}")
        print(f"  TOTAL would be: {total_after + len(small)} chunks (was {len(rows)})")
        return

    # ── Real rechunk ──────────────────────────────────────────────────────────
    # Group by document_id to manage chunk_index
    from collections import defaultdict
    doc_chunks: dict[str, list] = defaultdict(list)
    for row in rows:
        doc_chunks[row.document_id].append(row)

    total_deleted = total_inserted = total_embedded = 0

    async with AsyncSessionLocal() as db:
        for doc_id, chunk_rows in doc_chunks.items():
            title = chunk_rows[0].title
            so_ki = chunk_rows[0].so_ki_hieu

            new_chunks: list[dict] = []
            for row in chunk_rows:
                if len(row.content) <= 500:
                    # Keep small chunks as-is (will be re-assigned index later)
                    new_chunks.append({
                        "content": row.content,
                        "dieu_khoan": row.dieu_khoan,
                    })
                else:
                    cleaned = strip_boilerplate(row.content)
                    sub = split_into_chunks(cleaned)
                    for s in sub:
                        new_chunks.append({
                            "content": s,
                            "dieu_khoan": row.dieu_khoan,
                        })

            # Delete all old chunks for this doc
            await db.execute(
                delete(ReferenceDocChunk).where(ReferenceDocChunk.document_id == doc_id)
            )
            total_deleted += len(chunk_rows)

            # Embed new chunks
            texts = [c["content"] for c in new_chunks]
            try:
                embeddings = await asyncio.to_thread(embedding_service.embed_batch, texts)
            except Exception as exc:
                print(f"  embed error for {doc_id}: {exc}")
                embeddings = [None] * len(texts)

            # Insert new chunks
            db.add_all([
                ReferenceDocChunk(
                    id=str(uuid.uuid4()),
                    document_id=doc_id,
                    chunk_index=i,
                    content=c["content"],
                    dieu_khoan=c["dieu_khoan"],
                    token_count=len(c["content"]) // 4,
                    embedding=embeddings[i] if i < len(embeddings) else None,
                )
                for i, c in enumerate(new_chunks)
            ])
            total_inserted += len(new_chunks)
            total_embedded += sum(1 for e in embeddings if e is not None)

            print(f"  [{so_ki}] {title[:50]}: "
                  f"{len(chunk_rows)} → {len(new_chunks)} chunks ✅")

        await db.commit()

    print(f"\n=== RECHUNK DONE ===")
    print(f"  Chunks deleted:  {total_deleted}")
    print(f"  Chunks inserted: {total_inserted}")
    print(f"  Embeddings:      {total_embedded}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    asyncio.run(main(parser.parse_args().dry_run))
