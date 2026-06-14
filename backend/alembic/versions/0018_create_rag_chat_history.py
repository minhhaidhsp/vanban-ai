"""create_rag_chat_history

Revision ID: 0018
Revises: 0017
Create Date: 2026-06-14
"""
from alembic import op
import sqlalchemy as sa

revision = '0018'
down_revision = '0017'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'rag_chat_sessions',
        sa.Column('id', sa.String(36), nullable=False),
        sa.Column('user_id', sa.String(36), nullable=False),
        sa.Column('title', sa.String(255), nullable=False,
                  server_default='Cuộc tra cứu mới'),
        sa.Column('created_at', sa.DateTime(timezone=True),
                  server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True),
                  server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(
        'ix_rag_chat_sessions_user_id', 'rag_chat_sessions', ['user_id']
    )

    op.create_table(
        'rag_chat_messages',
        sa.Column('id', sa.String(36), nullable=False),
        sa.Column('session_id', sa.String(36), nullable=False),
        sa.Column('role', sa.String(20), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('citations', sa.JSON(), nullable=True),
        sa.Column('confidence', sa.Float(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True),
                  server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(
            ['session_id'], ['rag_chat_sessions.id'], ondelete='CASCADE'
        ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(
        'ix_rag_chat_messages_session_id', 'rag_chat_messages', ['session_id']
    )


def downgrade():
    op.drop_index('ix_rag_chat_messages_session_id',
                  table_name='rag_chat_messages')
    op.drop_table('rag_chat_messages')
    op.drop_index('ix_rag_chat_sessions_user_id',
                  table_name='rag_chat_sessions')
    op.drop_table('rag_chat_sessions')
