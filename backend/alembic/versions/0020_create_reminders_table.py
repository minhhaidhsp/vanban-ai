"""create_reminders_table

Revision ID: 0020
Revises: 0019
Create Date: 2026-06-19
"""
from alembic import op
import sqlalchemy as sa

revision = '0020'
down_revision = '0019'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'reminders',
        sa.Column('id', sa.String(36), primary_key=True, nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('remind_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('channel', sa.String(50), nullable=False, server_default='ics'),
        sa.Column('status', sa.String(20), nullable=False, server_default='pending'),
        sa.Column(
            'document_id', sa.String(36),
            sa.ForeignKey('documents.id', ondelete='SET NULL'),
            nullable=True,
        ),
        sa.Column(
            'owner_id', sa.String(36),
            sa.ForeignKey('users.id', ondelete='CASCADE'),
            nullable=False,
        ),
        sa.Column(
            'created_at', sa.DateTime(timezone=True),
            server_default=sa.text('now()'),
            nullable=True,
        ),
        sa.Column(
            'updated_at', sa.DateTime(timezone=True),
            server_default=sa.text('now()'),
            nullable=True,
        ),
    )
    op.create_index('ix_reminders_document_id', 'reminders', ['document_id'])
    op.create_index('ix_reminders_owner_id', 'reminders', ['owner_id'])


def downgrade() -> None:
    op.drop_index('ix_reminders_owner_id', table_name='reminders')
    op.drop_index('ix_reminders_document_id', table_name='reminders')
    op.drop_table('reminders')
