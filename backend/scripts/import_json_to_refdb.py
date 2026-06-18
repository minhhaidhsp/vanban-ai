"""
Import JSON thủ tục hành chính → reference_documents + reference_doc_chunks.
Giữ nguyên từng chunk JSON (không gộp/rechunk).

Sources:
  - data/ho chieu/TTHC.json          (hộ tịch, 5 procedures)
  - data/tre em/khai_sinh_normalized.json (13 procedures)

Usage:
  python backend/scripts/import_json_to_refdb.py [--dry-run]
"""
import sys, os, json, uuid, asyncio, argparse
from pathlib import Path
from collections import defaultdict
from datetime import date

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

# ── Config ────────────────────────────────────────────────────────────────────

ADMIN_USER_ID = "fed370d0-268a-4210-80f7-493c8cf11cec"
MIN_CONTENT_LEN = 80
CO_QUAN = "UBND TP. Hồ Chí Minh"

DATA_DIR = ROOT.parent / "data"
SOURCES = [
    DATA_DIR / "ho chieu" / "TTHC.json",
    DATA_DIR / "tre em" / "khai_sinh_normalized.json",
]


def parse_date(s: str | None) -> date | None:
    if not s or s in ("nan", "None", ""):
        return None
    for fmt in ("%Y-%m-%d", "%d/%m/%Y"):
        try:
            from datetime import datetime
            return datetime.strptime(s.strip(), fmt).date()
        except (ValueError, AttributeError):
            continue
    return None


def load_and_group(path: Path) -> dict[str, dict]:
    """
    Load JSON, filter noise, group by URL → one doc per URL.
    Each doc has a list of raw chunks from JSON.
    """
    with open(path, "r", encoding="utf-8") as f:
        records = json.load(f)

    groups: dict[str, dict] = {}
    skipped = 0

    for rec in records:
        content = rec.get("content_text", "").strip()
        if len(content) < MIN_CONTENT_LEN:
            skipped += 1
            continue

        title = rec.get("title", "").strip()
        url = rec.get("url", "").strip()
        meta = rec.get("metadata", {})
        hierarchy = rec.get("hierarchy", "").strip()

        key = url or title
        if not key:
            skipped += 1
            continue

        if key not in groups:
            groups[key] = {
                "title": title or meta.get("category", "Thủ tục hành chính"),
                "so_ki_hieu": str(meta.get("procedure_code", "") or ""),
                "category": meta.get("category", ""),
                "co_quan": (meta.get("official_announce")
                             or meta.get("offical_annouce", "") or CO_QUAN),
                "crawl_date": parse_date(str(meta.get("crawl_date", ""))),
                "url": url,
                "chunks": [],
            }

        groups[key]["chunks"].append({
            "content": content,
            "dieu_khoan": hierarchy[:199] if hierarchy else None,
            "token_count": int(meta.get("tokens", 0) or 0),
        })

    print(f"  {path.name}: {len(records)} raw → {skipped} noise → "
          f"{len(groups)} docs, {sum(len(g['chunks']) for g in groups.values())} chunks")
    return groups


def load_all() -> dict[str, dict]:
    all_groups: dict[str, dict] = {}
    for src in SOURCES:
        if not src.exists():
            print(f"  SKIP (not found): {src}")
            continue
        g = load_and_group(src)
        for k, v in g.items():
            if k not in all_groups:
                all_groups[k] = v
    return all_groups


async def run_import(groups: dict[str, dict]) -> None:
    from app.core.database import AsyncSessionLocal
    from app.models.reference_document import ReferenceDocument
    from app.models.reference_doc_chunk import ReferenceDocChunk
    from app.services import embedding_service
    from sqlalchemy import select

    if not embedding_service.is_available():
        print("Embedding model not loaded — loading now (may take 60-120s)...")
        await asyncio.to_thread(embedding_service._load_model)
        if not embedding_service.is_available():
            print("ERROR: Failed to load embedding model.")
            sys.exit(1)
        print("Embedding model ready ✅")

    # Load existing so_ki_hieu to skip duplicates
    async with AsyncSessionLocal() as db:
        existing_codes = set(
            row[0] for row in
            (await db.execute(
                select(ReferenceDocument.so_ki_hieu)
                .where(ReferenceDocument.visibility == "system")
            )).all()
        )
        existing_titles = set(
            row[0] for row in
            (await db.execute(
                select(ReferenceDocument.title)
                .where(ReferenceDocument.visibility == "system")
            )).all()
        )

    print(f"\nExisting system docs: so_ki_hieu={len(existing_codes)}, titles={len(existing_titles)}")

    docs = list(groups.values())
    total_inserted = total_chunks = total_embedded = total_skipped = 0

    async with AsyncSessionLocal() as db:
        for i, doc in enumerate(docs):
            # Skip duplicates
            code = doc["so_ki_hieu"]
            title = doc["title"]
            if (code and code != "nan" and code in existing_codes) or title in existing_titles:
                total_skipped += 1
                print(f"  [{i+1}/{len(docs)}] SKIP (exists): {title[:60]}")
                continue

            doc_id = str(uuid.uuid4())
            rd = ReferenceDocument(
                id=doc_id,
                title=title[:499],
                loai_van_ban="Thủ tục hành chính",
                so_ki_hieu=(code[:199] if code and code != "nan" else ""),
                co_quan_ban_hanh=(doc["co_quan"] or CO_QUAN)[:499],
                trich_yeu=(doc["url"] or doc["category"])[:499],
                hieu_luc="chua",
                visibility="system",
                created_by=ADMIN_USER_ID,
                ngay_ban_hanh=doc["crawl_date"],
            )
            db.add(rd)
            await db.flush()

            # Build chunks from JSON records
            raw_chunks = doc["chunks"]
            chunk_texts = [c["content"] for c in raw_chunks]

            # Embed in thread
            try:
                embeddings = await asyncio.to_thread(
                    embedding_service.embed_batch, chunk_texts
                )
                n_embedded = len(embeddings)
            except Exception as exc:
                print(f"  [{i+1}] embed error: {exc}, inserting chunks without embedding")
                embeddings = [None] * len(raw_chunks)
                n_embedded = 0

            db.add_all([
                ReferenceDocChunk(
                    id=str(uuid.uuid4()),
                    document_id=doc_id,
                    chunk_index=j,
                    content=c["content"],
                    dieu_khoan=c["dieu_khoan"],
                    token_count=c["token_count"],
                    embedding=embeddings[j] if j < len(embeddings) else None,
                )
                for j, c in enumerate(raw_chunks)
            ])

            # Doc-level embedding = first chunk
            if embeddings and embeddings[0] is not None:
                rd.embedding = embeddings[0]

            await db.commit()
            total_inserted += 1
            total_chunks += len(raw_chunks)
            total_embedded += n_embedded
            existing_codes.add(code)
            existing_titles.add(title)

            status = "✅" if n_embedded == len(raw_chunks) else f"⚠️ {n_embedded}/{len(raw_chunks)} embedded"
            print(f"  [{i+1}/{len(docs)}] {title[:55]!s} → {len(raw_chunks)} chunks {status}")

    print(f"\n=== DONE ===")
    print(f"  Documents inserted:   {total_inserted}")
    print(f"  Skipped (duplicate):  {total_skipped}")
    print(f"  Total chunks:         {total_chunks}")
    print(f"  Embeddings generated: {total_embedded}")


async def main(dry_run: bool) -> None:
    print("\n=== Loading source files ===")
    groups = load_all()
    print(f"\nTotal unique documents: {len(groups)}")
    total_chunks = sum(len(g["chunks"]) for g in groups.values())
    print(f"Total chunks:           {total_chunks}")

    if dry_run:
        print("\n=== DRY RUN — not inserting ===")
        for url, doc in list(groups.items())[:5]:
            print(f"  [{len(doc['chunks'])} chunks] {doc['title'][:70]}")
            print(f"    so_ki_hieu={doc['so_ki_hieu']} | category={doc['category']}")
        if len(groups) > 5:
            print(f"  ... and {len(groups)-5} more")
        print(f"\n  Would insert: {len(groups)} documents, ~{total_chunks} chunks")
        return

    await run_import(groups)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    asyncio.run(main(parser.parse_args().dry_run))
