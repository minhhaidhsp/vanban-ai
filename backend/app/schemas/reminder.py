from pydantic import BaseModel, field_validator
from datetime import datetime
from typing import Optional
import re

_EMAIL_RE = re.compile(r'^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$')


def _validate_recipients(v: list[str]) -> list[str]:
    if len(v) > 20:
        raise ValueError("Tối đa 20 người nhận")
    for email in v:
        if not _EMAIL_RE.match(email.strip()):
            raise ValueError(f"Email không hợp lệ: {email}")
    return [e.strip().lower() for e in v]


class ReminderCreate(BaseModel):
    title: str
    description: Optional[str] = None
    remind_at: datetime
    document_id: Optional[str] = None
    recipients: list[str] = []

    @field_validator("recipients")
    @classmethod
    def check_recipients(cls, v: list[str]) -> list[str]:
        return _validate_recipients(v)


class ReminderUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    remind_at: Optional[datetime] = None
    status: Optional[str] = None
    recipients: Optional[list[str]] = None

    @field_validator("recipients")
    @classmethod
    def check_recipients(cls, v: Optional[list[str]]) -> Optional[list[str]]:
        if v is None:
            return v
        return _validate_recipients(v)


class ReminderOut(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    remind_at: datetime
    channel: str
    status: str
    document_id: Optional[str] = None
    document_title: Optional[str] = None
    recipients: list[str] = []
    owner_id: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
