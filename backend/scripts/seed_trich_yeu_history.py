"""
Seed trich_yeu_history from existing documents.

Run once after migration 0007 (safe to run multiple times):
    python scripts/seed_trich_yeu_history.py
"""
import asyncio
import json
import sys
import os
from uuid import uuid4

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from datetime import datetime
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from app.core.database import AsyncSessionLocal
from app.models.document import Document
from app.models.trich_yeu_history import TrichYeuHistory

_TRICH_YEU_PREFIX: dict[str, str] = {
    "CV": "V/v ",
    "TB": "Về việc ",
    "TTr": "Về việc ",
    "BC": "Về ",
    "GM": "Về việc ",
    "GGT": "Về việc ",
}


def _normalize(trich_yeu: str, loai_vb: str | None) -> str:
    t = trich_yeu.strip()
    if not t:
        return t
    if t.startswith(("V/v", "Về việc", "Về ")):
        return t
    prefix = _TRICH_YEU_PREFIX.get(loai_vb or "", "")
    return f"{prefix}{t.lstrip()}" if prefix else t


async def seed() -> None:
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Document))
        docs = result.scalars().all()

        seeded = 0
        skipped = 0
        now = datetime.utcnow()

        for doc in docs:
            try:
                content = json.loads(doc.content or "{}")
                trich_yeu = content.get("trichYeu", "").strip()
                loai_vb = content.get("loaiVanBan", doc.loai_vb or "VB")
            except (json.JSONDecodeError, AttributeError):
                skipped += 1
                continue

            if not trich_yeu or len(trich_yeu) < 3:
                skipped += 1
                continue

            normalized = _normalize(trich_yeu, loai_vb)
            user_id = str(doc.owner_id) if doc.owner_id else None

            stmt = insert(TrichYeuHistory).values(
                id=str(uuid4()),
                loai_van_ban=loai_vb,
                trich_yeu=normalized,
                created_by=user_id,
                source_doc_id=str(doc.id),
                used_count=1,
                last_used_at=now,
                created_at=now,
            )
            stmt = stmt.on_conflict_do_update(
                index_elements=["loai_van_ban", "trich_yeu", "created_by"],
                set_={
                    "used_count": TrichYeuHistory.used_count + 1,
                    "last_used_at": now,
                },
            )
            await db.execute(stmt)
            seeded += 1
            print(f"  [{loai_vb}] {normalized[:60]}")

        await db.commit()
        print(f"\nDone — seeded: {seeded}, skipped: {skipped}")


if __name__ == "__main__":
    asyncio.run(seed())
