"""ref_doc_embedding

Revision ID: 0004
Revises: 0003
Create Date: 2026-05-22
"""
from alembic import op

revision: str = "0004"
down_revision: str = "0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Extension already exists from migration 0001 — ensure it anyway
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    # Add embedding column (1024-dim for BAAI/bge-m3)
    op.execute(
        "ALTER TABLE reference_documents "
        "ADD COLUMN IF NOT EXISTS embedding vector(1024)"
    )

    # ivfflat index for cosine similarity search
    # lists=100 is reasonable for datasets up to ~1M rows
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_ref_docs_embedding
        ON reference_documents
        USING ivfflat (embedding vector_cosine_ops)
        WITH (lists = 100)
    """)


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_ref_docs_embedding")
    op.execute(
        "ALTER TABLE reference_documents "
        "DROP COLUMN IF EXISTS embedding"
    )
