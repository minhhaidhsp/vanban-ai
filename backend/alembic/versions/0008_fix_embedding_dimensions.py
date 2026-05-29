"""fix_embedding_dimensions

documents.embedding was originally created as vector(1536) in migration 0001,
but BAAI/bge-m3 (the actual embedding model) outputs 1024 dimensions.
This migration drops the mismatched column and recreates it as vector(1024),
matching reference_documents.embedding and reference_doc_chunks.embedding.

Revision ID: 0008
Revises: 0007
Create Date: 2026-05-29
"""
from alembic import op

revision: str = "0008"
down_revision: str = "0007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Must drop index before altering vector column (pgvector requirement)
    op.execute("DROP INDEX IF EXISTS ix_documents_embedding")

    # Drop mismatched column (1536 dims) — data was invalid anyway; any embeddings
    # stored there would have been rejected at INSERT time with a dimension error.
    op.execute("ALTER TABLE documents DROP COLUMN IF EXISTS embedding")

    # Re-add with correct dimension (1024 — BAAI/bge-m3)
    op.execute("ALTER TABLE documents ADD COLUMN embedding vector(1024)")

    # Recreate HNSW index (matches __table_args__ in Document model)
    op.execute("""
        CREATE INDEX ix_documents_embedding
        ON documents
        USING hnsw (embedding vector_cosine_ops)
        WITH (m = 16, ef_construction = 64)
    """)


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_documents_embedding")
    op.execute("ALTER TABLE documents DROP COLUMN IF EXISTS embedding")
    op.execute("ALTER TABLE documents ADD COLUMN embedding vector(1536)")
    op.execute("""
        CREATE INDEX ix_documents_embedding
        ON documents
        USING hnsw (embedding vector_cosine_ops)
        WITH (m = 16, ef_construction = 64)
    """)
