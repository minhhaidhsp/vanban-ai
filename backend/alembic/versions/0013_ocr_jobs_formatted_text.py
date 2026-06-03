"""ocr_jobs_formatted_text

Add formatted_text column to store LLM-reformatted OCR output alongside
the raw text. Nullable to preserve backward compatibility with existing rows.

Revision ID: 0013
Revises: 0012
Create Date: 2026-06-03
"""
from alembic import op
import sqlalchemy as sa

revision: str = "0013"
down_revision: str = "0012"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("ocr_jobs", sa.Column("formatted_text", sa.Text, nullable=True))


def downgrade() -> None:
    op.drop_column("ocr_jobs", "formatted_text")
