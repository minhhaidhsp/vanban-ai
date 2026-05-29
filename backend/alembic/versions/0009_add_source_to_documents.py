"""add_source_to_documents

Adds a 'source' column to distinguish documents created via the editor
('editor') from documents uploaded as files ('upload').

Revision ID: 0009
Revises: 0008
Create Date: 2026-05-29
"""
from alembic import op
import sqlalchemy as sa

revision: str = "0009"
down_revision: str = "0008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "documents",
        sa.Column("source", sa.String(20), nullable=False, server_default="editor"),
    )
    op.create_index("ix_documents_source", "documents", ["source"])


def downgrade() -> None:
    op.drop_index("ix_documents_source", table_name="documents")
    op.drop_column("documents", "source")
