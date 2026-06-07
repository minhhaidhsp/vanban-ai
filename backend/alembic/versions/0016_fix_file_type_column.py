"""fix_file_type_column

Extend documents.file_type from VARCHAR(50) to TEXT.

Revision ID: 0016
Revises: 0015
Create Date: 2026-06-07
"""
from alembic import op
import sqlalchemy as sa

revision = '0016'
down_revision = '0015'
branch_labels = None
depends_on = None


def upgrade():
    op.alter_column('documents', 'file_type',
        existing_type=sa.String(50),
        type_=sa.Text(),
        existing_nullable=True)


def downgrade():
    op.alter_column('documents', 'file_type',
        existing_type=sa.Text(),
        type_=sa.String(50),
        existing_nullable=True)
