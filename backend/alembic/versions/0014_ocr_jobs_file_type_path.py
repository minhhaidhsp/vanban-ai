"""ocr_jobs_file_type_path

Add file_type and file_path columns to ocr_jobs.
file_type: "text_pdf" | "scanned_pdf" | "image"
file_path: R2 object path for text_pdf, null for scanned_pdf/image

Revision ID: 0014
Revises: 0013
Create Date: 2026-06-03
"""
from alembic import op
import sqlalchemy as sa

revision: str = "0014"
down_revision: str = "0013"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("ocr_jobs",
        sa.Column("file_type", sa.String(20), nullable=True))
    op.add_column("ocr_jobs",
        sa.Column("file_path", sa.String(1000), nullable=True))


def downgrade() -> None:
    op.drop_column("ocr_jobs", "file_path")
    op.drop_column("ocr_jobs", "file_type")
