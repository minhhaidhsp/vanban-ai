"""trich_yeu_history

Revision ID: 0007
Revises: 0006
Create Date: 2026-05-24
"""
from alembic import op
import sqlalchemy as sa

revision: str = "0007"
down_revision: str = "0006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "trich_yeu_history",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("loai_van_ban", sa.String(50), nullable=False),
        sa.Column("trich_yeu", sa.Text(), nullable=False),
        sa.Column("created_by", sa.String(), nullable=True),
        sa.Column("source_doc_id", sa.String(), nullable=True),
        sa.Column("used_count", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("last_used_at", sa.DateTime(), nullable=True, server_default=sa.text("now()")),
        sa.Column("created_at", sa.DateTime(), nullable=True, server_default=sa.text("now()")),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "idx_trich_yeu_history_loai",
        "trich_yeu_history",
        ["loai_van_ban", "created_by"],
    )
    op.create_index(
        "idx_trich_yeu_history_used",
        "trich_yeu_history",
        [sa.text("used_count DESC")],
    )
    op.create_index(
        "idx_trich_yeu_unique",
        "trich_yeu_history",
        ["loai_van_ban", "trich_yeu", "created_by"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index("idx_trich_yeu_unique", table_name="trich_yeu_history")
    op.drop_index("idx_trich_yeu_history_used", table_name="trich_yeu_history")
    op.drop_index("idx_trich_yeu_history_loai", table_name="trich_yeu_history")
    op.drop_table("trich_yeu_history")
