"""add_visibility_to_reference_docs

Adds a visibility column to reference_documents:
  'private' — chỉ người tạo xem được
  'org'     — chia sẻ trong cơ quan
  'system'  — tất cả người dùng xem được

Revision ID: 0010
Revises: 0009
Create Date: 2026-05-29
"""
from alembic import op
import sqlalchemy as sa

revision: str = "0010"
down_revision: str = "0009"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "reference_documents",
        sa.Column("visibility", sa.String(10), nullable=False, server_default="private"),
    )
    op.create_index("ix_ref_docs_visibility", "reference_documents", ["visibility"])
    # Backfill existing rows
    op.execute("UPDATE reference_documents SET visibility = 'private' WHERE visibility IS NULL")


def downgrade() -> None:
    op.drop_index("ix_ref_docs_visibility", table_name="reference_documents")
    op.drop_column("reference_documents", "visibility")
