"""ref_doc_chunks

Revision ID: 0005
Revises: 0004
Create Date: 2026-05-22
"""
from alembic import op

revision: str = "0005"
down_revision: str = "0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE IF NOT EXISTS reference_doc_chunks (
            id          VARCHAR(36) PRIMARY KEY,
            document_id VARCHAR(36) NOT NULL
                        REFERENCES reference_documents(id) ON DELETE CASCADE,
            chunk_index INTEGER      NOT NULL,
            content     TEXT         NOT NULL,
            dieu_khoan  VARCHAR(200),
            token_count INTEGER      NOT NULL DEFAULT 0,
            embedding   vector(1024),
            created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
        )
    """)
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_ref_doc_chunks_document_id "
        "ON reference_doc_chunks (document_id)"
    )
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_ref_doc_chunks_embedding
        ON reference_doc_chunks
        USING ivfflat (embedding vector_cosine_ops)
        WITH (lists = 100)
    """)


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS reference_doc_chunks")
