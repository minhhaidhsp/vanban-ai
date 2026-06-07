"""increase_file_path_length

Increase documents.file_path from VARCHAR(50) to TEXT to support long object paths.

Revision ID: 0015
Revises: 0014
Create Date: 2026-06-07
"""
from alembic import op
import sqlalchemy as sa

revision = '0015'
down_revision = '0014'
branch_labels = None
depends_on = None


def upgrade():
    op.alter_column('documents', 'file_path',
        existing_type=sa.String(50),
        type_=sa.Text(),
        existing_nullable=True)


def downgrade():
    op.alter_column('documents', 'file_path',
        existing_type=sa.Text(),
        type_=sa.String(50),
        existing_nullable=True)
