"""reference_docs

Revision ID: 0003
Revises: 0002
Create Date: 2026-05-22
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "0003"
down_revision: Union[str, None] = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "reference_documents",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("loai_van_ban", sa.String(20), nullable=False),
        sa.Column("so_ki_hieu", sa.String(200), nullable=False),
        sa.Column("ngay_ban_hanh", sa.Date(), nullable=True),
        sa.Column("co_quan_ban_hanh", sa.String(500), nullable=False),
        sa.Column("nguoi_ky", sa.String(200), nullable=True),
        sa.Column("trich_yeu", sa.Text(), nullable=False),
        sa.Column("hieu_luc", sa.String(20), nullable=False, server_default="chua"),
        sa.Column("file_path", sa.String(1000), nullable=True),
        sa.Column("file_size", sa.Integer(), nullable=True),
        sa.Column("file_type", sa.String(100), nullable=True),
        sa.Column("tom_tat", sa.Text(), nullable=True),
        sa.Column("tu_khoa", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column(
            "created_by", sa.String(36),
            sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False
        ),
    )
    op.create_index("ix_ref_docs_loai_vb", "reference_documents", ["loai_van_ban"])
    op.create_index("ix_ref_docs_hieu_luc", "reference_documents", ["hieu_luc"])
    op.create_index("ix_ref_docs_created_by", "reference_documents", ["created_by"])


def downgrade() -> None:
    op.drop_table("reference_documents")
