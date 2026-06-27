from sqlalchemy import String, Text, Integer, BigInteger, ForeignKey, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base
from typing import Optional
import uuid


class HoSo(Base):
    __tablename__ = "ho_so"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    ma_ho_so: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    loai_thu_tuc: Mapped[str] = mapped_column(String(255), nullable=False)
    ten_chu_ho_so: Mapped[str] = mapped_column(String(255), nullable=False)
    so_dien_thoai: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    dia_chi: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    mo_ta: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    trang_thai: Mapped[str] = mapped_column(String(50), nullable=False, default="moi", server_default="moi")
    nguon: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    ma_dvc: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    ly_do_bo_sung: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    owner_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    han_xu_ly: Mapped[Optional[DateTime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class HoSoBuoc(Base):
    __tablename__ = "ho_so_buoc"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    ho_so_id: Mapped[str] = mapped_column(String(36), ForeignKey("ho_so.id", ondelete="CASCADE"), nullable=False, index=True)
    thu_tu: Mapped[int] = mapped_column(Integer, nullable=False)
    ten_buoc: Mapped[str] = mapped_column(String(255), nullable=False)
    mo_ta: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    loai_hanh_dong: Mapped[str] = mapped_column(String(50), nullable=False)
    trang_thai: Mapped[str] = mapped_column(String(50), nullable=False, default="cho", server_default="cho")
    ket_qua: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    document_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("documents.id", ondelete="SET NULL"), nullable=True)
    hoan_thanh_luc: Mapped[Optional[DateTime]] = mapped_column(DateTime(timezone=True), nullable=True)


class HoSoFile(Base):
    __tablename__ = "ho_so_file"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    ho_so_id: Mapped[str] = mapped_column(String(36), ForeignKey("ho_so.id", ondelete="CASCADE"), nullable=False, index=True)
    ten_file: Mapped[str] = mapped_column(String(255), nullable=False)
    loai_file: Mapped[str] = mapped_column(String(50), nullable=False, default="ho_so_goc", server_default="ho_so_goc")
    duong_dan: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    kich_thuoc: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    uploaded_by: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
