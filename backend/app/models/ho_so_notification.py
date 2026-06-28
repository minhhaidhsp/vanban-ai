from sqlalchemy import String, Text, Boolean, ForeignKey, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base
import uuid


class HoSoNotification(Base):
    __tablename__ = "ho_so_notification"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    ho_so_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("ho_so.id", ondelete="CASCADE"), nullable=False, index=True
    )
    loai: Mapped[str] = mapped_column(String(50), nullable=False)
    tieu_de: Mapped[str] = mapped_column(String(255), nullable=False)
    noi_dung: Mapped[str] = mapped_column(Text, nullable=False)
    nguoi_nhan_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    da_doc: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    kenh: Mapped[str] = mapped_column(String(20), nullable=False, default="in_app", server_default="in_app")
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
