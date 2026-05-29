"""document_sources

Junction table linking user documents to reference documents.
Enables per-document RAG scoping: AI only searches within pinned sources.

Revision ID: 0011
Revises: 0010
Create Date: 2026-05-29
"""
from alembic import op
import sqlalchemy as sa

revision: str = "0011"
down_revision: str = "0010"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "document_sources",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("document_id", sa.String(36),
                  sa.ForeignKey("documents.id", ondelete="CASCADE"), nullable=False),
        sa.Column("reference_doc_id", sa.String(36),
                  sa.ForeignKey("reference_documents.id", ondelete="CASCADE"), nullable=False),
        sa.Column("added_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("document_id", "reference_doc_id", name="uq_document_sources"),
    )
    op.create_index("idx_document_sources_document_id", "document_sources", ["document_id"])


def downgrade() -> None:
    op.drop_index("idx_document_sources_document_id", table_name="document_sources")
    op.drop_table("document_sources")
