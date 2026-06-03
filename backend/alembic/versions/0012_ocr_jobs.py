"""ocr_jobs

Persists OCR results per user. Soft reference to users.id
(no FK constraint) consistent with lightweight stateless OCR flow.

Revision ID: 0012
Revises: 0011
Create Date: 2026-06-03
"""
from alembic import op
import sqlalchemy as sa

revision: str = "0012"
down_revision: str = "0011"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "ocr_jobs",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), nullable=False),
        sa.Column("filename", sa.String(500), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("text", sa.Text, nullable=True),
        sa.Column("page_count", sa.Integer, nullable=True),
        sa.Column("char_count", sa.Integer, nullable=True),
        sa.Column("error_msg", sa.Text, nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True),
            server_default=sa.text("now()"), nullable=False,
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True),
            server_default=sa.text("now()"), nullable=False,
        ),
    )
    op.create_index("ix_ocr_jobs_user_id", "ocr_jobs", ["user_id"])
    op.create_index("ix_ocr_jobs_status", "ocr_jobs", ["status"])
    op.create_index("ix_ocr_jobs_created_at", "ocr_jobs", ["created_at"])


def downgrade() -> None:
    op.drop_index("ix_ocr_jobs_created_at", table_name="ocr_jobs")
    op.drop_index("ix_ocr_jobs_status", table_name="ocr_jobs")
    op.drop_index("ix_ocr_jobs_user_id", table_name="ocr_jobs")
    op.drop_table("ocr_jobs")
