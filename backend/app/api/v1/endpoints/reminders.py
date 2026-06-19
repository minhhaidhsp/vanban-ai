import json
import logging

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from datetime import datetime, timezone
from typing import List, Optional

from app.core.config import get_settings
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.reminder import Reminder
from app.models.document import Document
from app.schemas.reminder import ReminderCreate, ReminderOut, ReminderUpdate
from app.services.email_service import send_reminder_email

logger = logging.getLogger(__name__)
router = APIRouter()


def _parse_recipients(raw: Optional[str]) -> list[str]:
    if not raw:
        return []
    try:
        return json.loads(raw)
    except Exception:
        return []


def _to_out(reminder: Reminder, document_title: Optional[str] = None) -> ReminderOut:
    return ReminderOut(
        id=reminder.id,
        title=reminder.title,
        description=reminder.description,
        remind_at=reminder.remind_at,
        channel=reminder.channel,
        status=reminder.status,
        document_id=reminder.document_id,
        document_title=document_title,
        recipients=_parse_recipients(reminder.recipients),
        owner_id=reminder.owner_id,
        created_at=reminder.created_at,
        updated_at=reminder.updated_at,
    )


# ── Specific paths first (before /{reminder_id}) ────────────────────────────

@router.get("/upcoming", response_model=List[ReminderOut])
async def get_upcoming(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    now = datetime.now(timezone.utc)
    rows = (await db.execute(
        select(Reminder, Document.title.label("doc_title"))
        .outerjoin(Document, Document.id == Reminder.document_id)
        .where(
            Reminder.owner_id == current_user.id,
            Reminder.remind_at > now,
            Reminder.status == "pending",
        )
        .order_by(Reminder.remind_at.asc())
        .limit(10)
    )).all()
    return [_to_out(r, doc_title) for r, doc_title in rows]


@router.get("/users/search")
async def search_users(
    q: str = Query(..., min_length=2),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Tìm user theo email hoặc tên trong hệ thống."""
    rows = (await db.execute(
        select(User.id, User.email, User.full_name)
        .where(
            User.is_active.is_(True),
            or_(
                User.email.ilike(f"%{q}%"),
                User.full_name.ilike(f"%{q}%"),
            ),
        )
        .limit(10)
    )).all()
    return [{"id": r.id, "email": r.email, "full_name": r.full_name} for r in rows]


# ── Collection endpoints ─────────────────────────────────────────────────────

@router.get("/", response_model=List[ReminderOut])
async def list_reminders(
    status_filter: Optional[str] = Query(None, alias="status"),
    upcoming: bool = Query(False),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = (
        select(Reminder, Document.title.label("doc_title"))
        .outerjoin(Document, Document.id == Reminder.document_id)
        .where(Reminder.owner_id == current_user.id)
    )
    if upcoming:
        now = datetime.now(timezone.utc)
        q = q.where(Reminder.remind_at > now, Reminder.status == "pending")
    elif status_filter:
        q = q.where(Reminder.status == status_filter)
    q = q.order_by(Reminder.remind_at.asc())
    rows = (await db.execute(q)).all()
    return [_to_out(r, doc_title) for r, doc_title in rows]


@router.post("/", response_model=ReminderOut, status_code=status.HTTP_201_CREATED)
async def create_reminder(
    body: ReminderCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    reminder = Reminder(
        title=body.title,
        description=body.description,
        remind_at=body.remind_at,
        document_id=body.document_id or None,
        recipients=json.dumps(body.recipients) if body.recipients else None,
        owner_id=current_user.id,
    )
    db.add(reminder)
    await db.flush()
    await db.refresh(reminder)

    doc_title = None
    if reminder.document_id:
        doc_title = (await db.execute(
            select(Document.title).where(Document.id == reminder.document_id)
        )).scalar_one_or_none()

    out = _to_out(reminder, doc_title)

    if out.recipients:
        background_tasks.add_task(
            send_reminder_email, out, get_settings(), "https://vanban.ai"
        )

    return out


# ── Item endpoints ───────────────────────────────────────────────────────────

@router.get("/{reminder_id}", response_model=ReminderOut)
async def get_reminder(
    reminder_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    row = (await db.execute(
        select(Reminder, Document.title.label("doc_title"))
        .outerjoin(Document, Document.id == Reminder.document_id)
        .where(Reminder.id == reminder_id, Reminder.owner_id == current_user.id)
    )).first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reminder not found")
    reminder, doc_title = row
    return _to_out(reminder, doc_title)


@router.patch("/{reminder_id}", response_model=ReminderOut)
async def update_reminder(
    reminder_id: str,
    body: ReminderUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Reminder).where(Reminder.id == reminder_id, Reminder.owner_id == current_user.id)
    )
    reminder = result.scalar_one_or_none()
    if not reminder:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reminder not found")

    for field, value in body.model_dump(exclude_unset=True).items():
        if field == "recipients":
            setattr(reminder, "recipients", json.dumps(value) if value is not None else None)
        else:
            setattr(reminder, field, value)

    await db.flush()
    await db.refresh(reminder)

    doc_title = None
    if reminder.document_id:
        doc_title = (await db.execute(
            select(Document.title).where(Document.id == reminder.document_id)
        )).scalar_one_or_none()

    return _to_out(reminder, doc_title)


@router.delete("/{reminder_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_reminder(
    reminder_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Reminder).where(Reminder.id == reminder_id, Reminder.owner_id == current_user.id)
    )
    reminder = result.scalar_one_or_none()
    if not reminder:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reminder not found")
    await db.delete(reminder)


@router.post("/{reminder_id}/resend", status_code=status.HTTP_202_ACCEPTED)
async def resend_reminder(
    reminder_id: str,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Gửi lại email nhắc hẹn cho tất cả recipients."""
    row = (await db.execute(
        select(Reminder, Document.title.label("doc_title"))
        .outerjoin(Document, Document.id == Reminder.document_id)
        .where(Reminder.id == reminder_id, Reminder.owner_id == current_user.id)
    )).first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reminder not found")
    reminder, doc_title = row
    out = _to_out(reminder, doc_title)

    if not out.recipients:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reminder không có người nhận",
        )

    background_tasks.add_task(
        send_reminder_email, out, get_settings(), "https://vanban.ai"
    )
    return {"status": "queued", "recipients": out.recipients}
