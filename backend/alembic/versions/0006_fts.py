"""fts_vietnamese

Revision ID: 0006
Revises: 0005
Create Date: 2026-05-22
"""
from alembic import op

revision: str = "0006"
down_revision: str = "0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS unaccent")
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")

    op.execute(
        "ALTER TABLE reference_documents "
        "ADD COLUMN IF NOT EXISTS search_vector tsvector"
    )

    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_fts_reference_documents
        ON reference_documents USING GIN(search_vector)
    """)

    op.execute("""
        CREATE OR REPLACE FUNCTION update_search_vector()
        RETURNS trigger AS $$
        BEGIN
          NEW.search_vector :=
            setweight(to_tsvector('simple',
              unaccent(COALESCE(NEW.title, ''))), 'A') ||
            setweight(to_tsvector('simple',
              unaccent(COALESCE(NEW.so_ki_hieu, ''))), 'A') ||
            setweight(to_tsvector('simple',
              unaccent(COALESCE(NEW.trich_yeu, ''))), 'B') ||
            setweight(to_tsvector('simple',
              unaccent(COALESCE(NEW.co_quan_ban_hanh, ''))), 'C') ||
            setweight(to_tsvector('simple',
              unaccent(COALESCE(NEW.tom_tat, ''))), 'D');
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql
    """)

    op.execute("""
        CREATE TRIGGER trig_search_vector
        BEFORE INSERT OR UPDATE ON reference_documents
        FOR EACH ROW EXECUTE FUNCTION update_search_vector()
    """)

    # Backfill existing rows
    op.execute("UPDATE reference_documents SET title = title")


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS trig_search_vector ON reference_documents")
    op.execute("DROP FUNCTION IF EXISTS update_search_vector()")
    op.execute("DROP INDEX IF EXISTS idx_fts_reference_documents")
    op.execute(
        "ALTER TABLE reference_documents "
        "DROP COLUMN IF EXISTS search_vector"
    )
