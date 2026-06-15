"""add_theme_to_organizations

Revision ID: 0019
Revises: 0018
Create Date: 2026-06-15
"""
from alembic import op
import sqlalchemy as sa

revision = '0019'
down_revision = '0018'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        'organizations',
        sa.Column('theme', sa.String(50), nullable=False, server_default='teal'),
    )


def downgrade() -> None:
    op.drop_column('organizations', 'theme')
