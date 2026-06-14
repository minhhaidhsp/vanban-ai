from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.rag_chat import RagChatMessage, RagChatSession
from app.models.user import User

router = APIRouter()


# ── Schemas ───────────────────────────────────────────────────────────────────

class RagChatMessageResponse(BaseModel):
    id:         str
    role:       str
    content:    str
    citations:  list[dict] | None = None
    confidence: float | None = None
    created_at: datetime

    class Config:
        from_attributes = True


class RagChatSessionResponse(BaseModel):
    id:         str
    title:      str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class RagChatSessionDetailResponse(RagChatSessionResponse):
    messages: list[RagChatMessageResponse] = []


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/", response_model=RagChatSessionResponse, status_code=201)
async def create_session(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = RagChatSession(user_id=current_user.id)
    db.add(session)
    await db.flush()
    await db.refresh(session)
    return session


@router.get("/", response_model=list[RagChatSessionResponse])
async def list_sessions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(RagChatSession)
        .where(RagChatSession.user_id == current_user.id)
        .order_by(RagChatSession.updated_at.desc())
    )
    return result.scalars().all()


@router.get("/{session_id}", response_model=RagChatSessionDetailResponse)
async def get_session(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(RagChatSession)
        .where(
            RagChatSession.id == session_id,
            RagChatSession.user_id == current_user.id,
        )
        .options(selectinload(RagChatSession.messages))
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(404, "Không tìm thấy cuộc tra cứu")
    return session


@router.delete("/{session_id}", status_code=204)
async def delete_session(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(RagChatSession).where(
            RagChatSession.id == session_id,
            RagChatSession.user_id == current_user.id,
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(404, "Không tìm thấy cuộc tra cứu")
    await db.delete(session)
    await db.commit()
