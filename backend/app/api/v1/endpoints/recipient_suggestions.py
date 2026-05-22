from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.recipient_suggestion import RecipientSuggestion
import uuid

router = APIRouter()


@router.get("/")
async def search_suggestions(
    q: str = Query(default="", max_length=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stmt = select(RecipientSuggestion)
    if q.strip():
        stmt = stmt.where(RecipientSuggestion.name.ilike(f"%{q}%"))
    stmt = stmt.order_by(RecipientSuggestion.frequency.desc()).limit(10)
    result = await db.execute(stmt)
    return [{"id": s.id, "name": s.name} for s in result.scalars().all()]


@router.post("/increment")
async def increment_suggestion(
    name: str = Query(..., max_length=500),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(RecipientSuggestion).where(RecipientSuggestion.name == name)
    )
    suggestion = result.scalar_one_or_none()
    if suggestion:
        suggestion.frequency += 1
    else:
        suggestion = RecipientSuggestion(
            id=str(uuid.uuid4()), name=name, frequency=1
        )
        db.add(suggestion)
    await db.flush()
    return {"ok": True}
