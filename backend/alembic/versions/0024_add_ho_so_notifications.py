"""add_ho_so_notifications

Revision ID: 0024
Revises: 0023
Create Date: 2026-06-28
"""
from alembic import op
import sqlalchemy as sa

revision = "0024"
down_revision = "0023"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "ho_so_notification",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column(
            "ho_so_id",
            sa.String(36),
            sa.ForeignKey("ho_so.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("loai", sa.String(50), nullable=False),
        sa.Column("tieu_de", sa.String(255), nullable=False),
        sa.Column("noi_dung", sa.Text, nullable=False),
        sa.Column(
            "nguoi_nhan_id",
            sa.String(36),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("da_doc", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("kenh", sa.String(20), nullable=False, server_default="in_app"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade():
    op.drop_table("ho_so_notification")
