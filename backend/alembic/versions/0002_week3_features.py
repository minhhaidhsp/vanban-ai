"""week3_features

Revision ID: 0002
Revises: 0001
Create Date: 2026-05-22
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── Extend documents table ──────────────────────────────────
    op.add_column("documents", sa.Column("loai_vb", sa.String(10), nullable=True))
    op.add_column("documents", sa.Column("so_van_ban", sa.Integer(), nullable=True))
    op.add_column("documents", sa.Column("nam", sa.Integer(), nullable=True))
    op.create_index("ix_documents_loai_vb_nam", "documents", ["loai_vb", "nam"])

    # ── organizations ───────────────────────────────────────────
    op.create_table(
        "organizations",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("ten_chu_quan", sa.String(500), nullable=False),
        sa.Column("ten_co_quan", sa.String(500), nullable=False),
        sa.Column("viet_tat", sa.String(50), nullable=False, server_default="UBND"),
        sa.Column("dia_danh", sa.String(100), nullable=False, server_default="TP. Ho Chi Minh"),
        sa.Column("chu_ky_mac_dinh", sa.JSON(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # ── recipient_suggestions ───────────────────────────────────
    op.create_table(
        "recipient_suggestions",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("name", sa.String(500), nullable=False, unique=True),
        sa.Column("frequency", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # ── Seed organizations ──────────────────────────────────────
    op.execute(sa.text(
        "INSERT INTO organizations (id, ten_chu_quan, ten_co_quan, viet_tat, dia_danh, chu_ky_mac_dinh, is_active) "
        "VALUES ('org-default-001', 'UBND THANH PHO HO CHI MINH', 'UBND PHUONG NHIEU LOC', "
        "'UBND', 'TP. Ho Chi Minh', "
        "'{\"quyen_han\": \"TM.\", \"ten_tap_the\": \"UY BAN NHAN DAN\", \"chuc_vu\": \"CHU TICH\"}', true)"
    ))

    # ── Seed recipient suggestions ──────────────────────────────
    op.execute(sa.text(
        "INSERT INTO recipient_suggestions (id, name, frequency) VALUES "
        "('rs-001', '- Nhu tren;', 10), "
        "('rs-002', '- Luu: VT.', 10), "
        "('rs-003', '- UBND thanh pho (de bao cao);', 5), "
        "('rs-004', '- Cac phong, ban lien quan;', 5), "
        "('rs-005', '- Luu: VT, VP.', 8)"
    ))


def downgrade() -> None:
    op.drop_table("recipient_suggestions")
    op.drop_table("organizations")
    op.drop_index("ix_documents_loai_vb_nam", table_name="documents")
    op.drop_column("documents", "nam")
    op.drop_column("documents", "so_van_ban")
    op.drop_column("documents", "loai_vb")
