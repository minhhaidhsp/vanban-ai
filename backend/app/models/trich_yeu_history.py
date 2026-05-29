from datetime import datetime
from uuid import uuid4

from sqlalchemy import DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class TrichYeuHistory(Base):
    __tablename__ = "trich_yeu_history"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    loai_van_ban: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    trich_yeu: Mapped[str] = mapped_column(Text, nullable=False)
    created_by: Mapped[str | None] = mapped_column(String, nullable=True)
    source_doc_id: Mapped[str | None] = mapped_column(String, nullable=True)
    used_count: Mapped[int] = mapped_column(Integer, default=1)
    last_used_at: Mapped[datetime | None] = mapped_column(DateTime, default=datetime.utcnow)
    created_at: Mapped[datetime | None] = mapped_column(DateTime, default=datetime.utcnow)
