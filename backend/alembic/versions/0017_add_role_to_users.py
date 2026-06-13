"""add_role_to_users

Revision ID: 0017
Revises: 0016
Create Date: 2026-06-14
"""
from alembic import op
import sqlalchemy as sa

revision = '0017'
down_revision = '0016'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        'users',
        sa.Column('role', sa.String(20), nullable=False, server_default='staff'),
    )


def downgrade():
    op.drop_column('users', 'role')
