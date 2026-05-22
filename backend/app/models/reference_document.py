from sqlalchemy import String, Text, Integer, Date, JSON, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base
from datetime import date, datetime
import uuid


class ReferenceDocument(Base):
    __tablename__ = "reference_documents"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    title: Mapped[str] = mapped_column(String(500))
    loai_van_ban: Mapped[str] = mapped_column(String(20), index=True)
    so_ki_hieu: Mapped[str] = mapped_column(String(200))
    ngay_ban_hanh: Mapped[date | None] = mapped_column(Date, nullable=True)
    co_quan_ban_hanh: Mapped[str] = mapped_column(String(500))
    nguoi_ky: Mapped[str | None] = mapped_column(String(200), nullable=True)
    trich_yeu: Mapped[str] = mapped_column(Text)
    hieu_luc: Mapped[str] = mapped_column(String(20), default="chua", index=True)
    file_path: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    file_size: Mapped[int | None] = mapped_column(Integer, nullable=True)
    file_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    tom_tat: Mapped[str | None] = mapped_column(Text, nullable=True)
    tu_khoa: Mapped[list] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    created_by: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
