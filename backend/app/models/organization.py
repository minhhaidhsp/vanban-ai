from sqlalchemy import String, Boolean, DateTime, JSON, func
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base
import uuid


class Organization(Base):
    __tablename__ = "organizations"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    ten_chu_quan: Mapped[str] = mapped_column(String(500))
    ten_co_quan: Mapped[str] = mapped_column(String(500))
    viet_tat: Mapped[str] = mapped_column(String(50), default="UBND")
    dia_danh: Mapped[str] = mapped_column(String(100), default="TP. Ho Chi Minh")
    chu_ky_mac_dinh: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
