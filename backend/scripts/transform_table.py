"""
Transform dichvucong pipe-table chunks → plain text for better RAG embedding.

Format input (all on one line, items separated by \-):
  "Tên giấy tờ | Mẫu đơn, tờ khai | Số lượng ---|---|---
   \- [item1] | [link1] | Bản chính: 0 - Bản sao: 0
   \- [item2] | [link2] | Bản chính: 0 - Bản sao: 0 ..."

Format output (plain text):
  "Thành phần hồ sơ gồm:
   1. Tờ khai đăng ký khai sinh (theo mẫu)
   2. Giấy chứng sinh bản chính
   ..."

Usage:
  python backend/scripts/transform_table.py [--dry-run]
"""
import sys, re, asyncio, argparse
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

# ── Boilerplate detection ────────────────────────────────────────────────────

# These phrases signal procedural boilerplate, not actual required documents
_BOILERPLATE_PREFIXES = (
    "cá nhân có quyền lựa chọn",
    "đối với giấy tờ nộp, xuất trình",
    "đối với giấy tờ gửi kèm",
    "người yêu cầu đăng ký hộ tịch có thể nộp",
    "người tiếp nhận có trách nhiệm",
    "người tiếp nhận hồ sơ thực hiện",
    "trường hợp người yêu cầu nộp bản chụp",
    "đối với giấy tờ xuất trình",
    "cơ quan đăng ký hộ tịch từ chối",
    "trong thời hạn",
    "trường hợp cho phép",
    "đối với việc xác định họ, dân tộc",
    "việc xác định họ, dân tộc",
    "trường hợp cha, mẹ không thỏa thuận",
    "đối với yêu cầu đăng ký khai sinh mà cha, mẹ",
    "kết quả tra cứu được lưu trữ",
    "trong trường hợp không tra cứu",
    "giấy tờ do cơ quan có thẩm quyền của nước ngoài",
    "trường hợp người yêu cầu đăng ký hộ tịch lựa chọn nhận kết quả",
    "trường hợp người yêu cầu đăng ký hộ tịch không cung cấp",
)

_LINK_RE = re.compile(
    r'\[([^\]]*)\]\(https?://[^\)]+\)', re.IGNORECASE
)
_INLINE_SUFFIX_RE = re.compile(
    r'\s*\|\s*\[[^\]]*\]\(https?://[^\)]*\)\s*\|\s*Bản chính[^\\]*',
    re.IGNORECASE
)
# Also strip bare [](url) with empty alt text
_BARE_LINK_RE = re.compile(
    r'\s*\|\s*\[\]\(https?://[^\)]+\)\s*\|\s*Bản chính[^\-\\]*(-\s*Bản sao\s*:\s*\d+)?',
    re.IGNORECASE
)


def _is_boilerplate(text: str) -> bool:
    t = text.lower().strip()
    return any(t.startswith(p) for p in _BOILERPLATE_PREFIXES) or len(t) > 350


def _clean_item(raw: str) -> str:
    """Strip dichvucong link+count suffix, return clean document name."""
    # Remove `| [filename](url) | Bản chính: N - Bản sao: N`
    s = _INLINE_SUFFIX_RE.sub('', raw)
    s = _BARE_LINK_RE.sub('', s)
    # Inline named links → keep link text if meaningful
    s = _LINK_RE.sub(lambda m: f"(Mẫu: {m.group(1)})" if m.group(1).strip() else '', s)
    s = re.sub(r'\s+', ' ', s).strip()
    s = re.sub(r'^[\\+*•-]\s*', '', s)  # strip leading \- \+
    return s.strip()


def _is_dichvucong_table(text: str) -> bool:
    """True if content matches dichvucong table format (both types)."""
    t = text.strip()
    return bool(
        re.match(r'Tên giấy tờ\s*\|\s*Mẫu đơn', t, re.IGNORECASE) or
        re.match(r'Hình thức nộp\s*\|\s*Thời hạn', t, re.IGNORECASE)
    )


def _transform_cach_thuc(raw: str, hierarchy: str = "") -> str:
    """Transform 'Cách thức thực hiện' pipe-table → plain text."""
    section = hierarchy.split('>')[-1].strip() if hierarchy else "Cách thức thực hiện"

    # Split rows: each row ends with \n or is separated by pipe-groups
    # Header line: "Hình thức nộp | Thời hạn | Phí, lệ phí | Mô tả\n---|---|...\n"
    # Strip header + separator
    body = re.sub(r'^Hình thức nộp[^\n]*\n?', '', raw.strip(), flags=re.IGNORECASE)
    body = re.sub(r'^-{3,}[|\-\s]+\n?', '', body, flags=re.MULTILINE)

    # Each row: "Trực tiếp | Thời hạn | Lệ phí | Mô tả"
    # Rows separated by newlines (or inline via \n)
    rows = []
    for line in body.split('\n'):
        line = line.strip()
        if not line or line == '---':
            continue
        parts = [p.strip() for p in line.split('|')]
        if len(parts) < 2:
            continue

        hinh_thuc = parts[0].strip(' \\-+') if parts else ""
        tgian = parts[1] if len(parts) > 1 else ""
        lephi = parts[2] if len(parts) > 2 else ""
        mota  = parts[3] if len(parts) > 3 else ""

        # Clean Lệ phí: remove "Xem chi tiết" noise
        lephi = re.sub(r'Xem chi tiết.*', '', lephi).strip()
        lephi = re.sub(r'\* ', '', lephi).strip()

        if not hinh_thuc or hinh_thuc.lower() in ('---', ''):
            continue

        row_parts = []
        if hinh_thuc:
            row_parts.append(f"Hình thức: {hinh_thuc}")
        if tgian.strip():
            row_parts.append(f"Thời hạn: {tgian.strip()}")
        if lephi.strip():
            row_parts.append(f"Lệ phí: {lephi.strip()}")
        if mota.strip():
            row_parts.append(f"Mô tả: {mota.strip()[:200]}")

        if row_parts:
            rows.append("- " + "; ".join(row_parts))

    if not rows:
        return raw  # fallback

    return f"{section}:\n" + "\n".join(rows)


def transform_content(raw: str, hierarchy: str = "") -> str:
    """
    Transform dichvucong pipe-table to plain text.
    Returns original text unchanged if not a table format.
    """
    if not _is_dichvucong_table(raw):
        return raw

    # Dispatch based on table type
    if re.match(r'Hình thức nộp\s*\|\s*Thời hạn', raw.strip(), re.IGNORECASE):
        return _transform_cach_thuc(raw, hierarchy)

    # Split into items on \- markers — "Thành phần hồ sơ" type
    # The format is: header ---|---|--- \- item1 \- item2 ...
    # Strip everything up to and including the separator
    body = re.sub(r'^Tên giấy tờ[^\-]+---[^\\]*', '', raw, flags=re.IGNORECASE | re.DOTALL)

    # Split on \- or \+
    raw_items = re.split(r'\\[-+]', body)

    docs = []
    for item in raw_items:
        if not item.strip():
            continue
        cleaned = _clean_item(item)
        if not cleaned or len(cleaned) < 5:
            continue
        if _is_boilerplate(cleaned):
            continue
        docs.append(cleaned)

    if not docs:
        # Fallback: strip only the obvious boilerplate prefix and link suffixes
        # Return cleaned version without full transform
        stripped = _BARE_LINK_RE.sub('', raw)
        stripped = _INLINE_SUFFIX_RE.sub('', stripped)
        stripped = re.sub(r'Tên giấy tờ\s*\|\s*Mẫu đơn[^\-]+---', '', stripped, flags=re.IGNORECASE)
        stripped = re.sub(r'\\[-+]\s*', '\n- ', stripped)
        stripped = re.sub(r'\s+', ' ', stripped).strip()
        return stripped if len(stripped) > 100 else raw

    # Determine section name from hierarchy
    section = hierarchy.split('>')[-1].strip() if hierarchy else "Thành phần hồ sơ"
    prefix = f"{section} gồm:\n"

    return prefix + '\n'.join(f"{i+1}. {d}" for i, d in enumerate(docs))


# ── Script body ───────────────────────────────────────────────────────────────

async def main(dry_run: bool) -> None:
    from app.core.database import AsyncSessionLocal
    from app.models.reference_document import ReferenceDocument
    from app.models.reference_doc_chunk import ReferenceDocChunk
    from app.services import embedding_service
    from sqlalchemy import select, update
    import uuid

    # Fetch chunks
    async with AsyncSessionLocal() as db:
        rows = (await db.execute(
            select(
                ReferenceDocChunk.id,
                ReferenceDocChunk.content,
                ReferenceDocChunk.dieu_khoan,
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

    table_chunks = [r for r in rows if _is_dichvucong_table(r.content)]
    plain_chunks = [r for r in rows if not _is_dichvucong_table(r.content)]

    print(f"\nTotal chunks: {len(rows)}")
    print(f"  Table format (will transform): {len(table_chunks)}")
    print(f"  Plain text (keep as-is):       {len(plain_chunks)}")

    if dry_run:
        print("\n=== DRY RUN — 3 examples BEFORE/AFTER ===")
        shown = 0
        for row in table_chunks:
            if shown >= 3:
                break
            transformed = transform_content(row.content, row.dieu_khoan or "")
            if transformed == row.content:
                continue
            print(f"\n--- [{row.so_ki_hieu}] {row.title[:60]}")
            print(f"    dieu_khoan: {row.dieu_khoan}")
            print(f"\n=== BEFORE ({len(row.content)} chars) ===")
            print(row.content[:500] + ("..." if len(row.content) > 500 else ""))
            print(f"\n=== AFTER ({len(transformed)} chars) ===")
            print(transformed[:800])
            shown += 1

        # Stats
        improved = sum(
            1 for r in table_chunks
            if transform_content(r.content, r.dieu_khoan or "") != r.content
        )
        emptied = sum(
            1 for r in table_chunks
            if len(transform_content(r.content, r.dieu_khoan or "").strip()) < 50
        )
        print(f"\nSummary:")
        print(f"  Would transform: {improved}/{len(table_chunks)} chunks")
        print(f"  Would strip to empty (fallback): {emptied}")
        return

    # ── Real transform + re-embed ─────────────────────────────────────────────
    if not embedding_service.is_available():
        print("Loading embedding model...")
        await asyncio.to_thread(embedding_service._load_model)
        if not embedding_service.is_available():
            print("ERROR: model load failed"); sys.exit(1)
        print("Model ready ✅")

    updated = skipped = 0
    async with AsyncSessionLocal() as db:
        for row in table_chunks:
            transformed = transform_content(row.content, row.dieu_khoan or "")
            if transformed == row.content or len(transformed.strip()) < 50:
                skipped += 1
                continue
            try:
                emb = await asyncio.to_thread(embedding_service.embed_batch, [transformed])
                await db.execute(
                    update(ReferenceDocChunk)
                    .where(ReferenceDocChunk.id == row.id)
                    .values(content=transformed, embedding=emb[0])
                )
                updated += 1
                if updated % 10 == 0:
                    await db.commit()
                    print(f"  Updated {updated}...")
            except Exception as exc:
                print(f"  ERROR {row.id}: {exc}")
                skipped += 1
        await db.commit()

    print(f"\n=== DONE ===")
    print(f"  Chunks updated + re-embedded: {updated}")
    print(f"  Skipped (no change / empty):  {skipped}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    asyncio.run(main(parser.parse_args().dry_run))
