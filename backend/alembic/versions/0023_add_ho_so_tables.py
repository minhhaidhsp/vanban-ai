"""add_ho_so_tables

Revision ID: 0023
Revises: 0022
Create Date: 2026-06-27
"""
from alembic import op
import sqlalchemy as sa

revision = "0023"
down_revision = "0022"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "ho_so",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("ma_ho_so", sa.String(50), unique=True, nullable=False, index=True),
        sa.Column("loai_thu_tuc", sa.String(255), nullable=False),
        sa.Column("ten_chu_ho_so", sa.String(255), nullable=False),
        sa.Column("so_dien_thoai", sa.String(20), nullable=True),
        sa.Column("dia_chi", sa.Text, nullable=True),
        sa.Column("mo_ta", sa.Text, nullable=True),
        sa.Column("trang_thai", sa.String(50), nullable=False, server_default="moi"),
        sa.Column("nguon", sa.String(100), nullable=True),
        sa.Column("ma_dvc", sa.String(100), nullable=True),
        sa.Column("ly_do_bo_sung", sa.Text, nullable=True),
        sa.Column("owner_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("han_xu_ly", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "ho_so_buoc",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("ho_so_id", sa.String(36), sa.ForeignKey("ho_so.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("thu_tu", sa.Integer, nullable=False),
        sa.Column("ten_buoc", sa.String(255), nullable=False),
        sa.Column("mo_ta", sa.Text, nullable=True),
        sa.Column("loai_hanh_dong", sa.String(50), nullable=False),
        sa.Column("trang_thai", sa.String(50), nullable=False, server_default="cho"),
        sa.Column("ket_qua", sa.Text, nullable=True),
        sa.Column("document_id", sa.String(36), sa.ForeignKey("documents.id", ondelete="SET NULL"), nullable=True),
        sa.Column("hoan_thanh_luc", sa.DateTime(timezone=True), nullable=True),
    )

    op.create_table(
        "ho_so_file",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("ho_so_id", sa.String(36), sa.ForeignKey("ho_so.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("ten_file", sa.String(255), nullable=False),
        sa.Column("loai_file", sa.String(50), nullable=False, server_default="ho_so_goc"),
        sa.Column("duong_dan", sa.Text, nullable=True),
        sa.Column("kich_thuoc", sa.BigInteger, nullable=True),
        sa.Column("uploaded_by", sa.String(36), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade():
    op.drop_table("ho_so_file")
    op.drop_table("ho_so_buoc")
    op.drop_table("ho_so")
