"""initial_schema

Revision ID: 000000000001
Revises: 
Create Date: 2026-04-30 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '000000000001'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create initial schema with unified timezone handling."""
    # users table
    op.create_table(
        'users',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('hashed_password', sa.Text(), nullable=False),
        sa.Column(
            'created_at',
            sa.DateTime(timezone=True),
            server_default=sa.text('now()'),
            nullable=False
        ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email')
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)

    # todos table
    op.create_table(
        'todos',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('is_completed', sa.Boolean(), nullable=True),
        sa.Column('priority', sa.String(length=10), nullable=True),
        sa.Column('due_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('tags', sa.String(length=500), nullable=True),
        sa.Column(
            'created_at',
            sa.DateTime(timezone=True),
            server_default=sa.text('now()'),
            nullable=False
        ),
        sa.Column(
            'updated_at',
            sa.DateTime(timezone=True),
            server_default=sa.text('now()'),
            nullable=False
        ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_todos_user_id'), 'todos', ['user_id'], unique=False)
    op.create_index(op.f('ix_todos_created_at'), 'todos', ['created_at'], unique=False)
    op.create_index(op.f('ix_todos_is_completed'), 'todos', ['is_completed'], unique=False)
    op.create_index(op.f('ix_todos_priority'), 'todos', ['priority'], unique=False)
    op.create_index(op.f('ix_todos_due_date'), 'todos', ['due_date'], unique=False)

    # password_reset_tokens table
    op.create_table(
        'password_reset_tokens',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('token_hash', sa.String(), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('used', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column(
            'created_at',
            sa.DateTime(timezone=True),
            server_default=sa.text('now()'),
            nullable=False
        ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(
        op.f('ix_password_reset_tokens_token_hash'),
        'password_reset_tokens',
        ['token_hash'],
        unique=False
    )

    # Auto-update trigger for todos.updated_at
    op.execute("""
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $$ language 'plpgsql';
    """)
    op.execute("""
        CREATE TRIGGER update_todos_updated_at
            BEFORE UPDATE ON todos
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    """)


def downgrade() -> None:
    """Drop all tables and triggers."""
    op.execute("DROP TRIGGER IF EXISTS update_todos_updated_at ON todos;")
    op.execute("DROP FUNCTION IF EXISTS update_updated_at_column();")

    op.drop_index(
        op.f('ix_password_reset_tokens_token_hash'),
        table_name='password_reset_tokens'
    )
    op.drop_table('password_reset_tokens')

    op.drop_index(op.f('ix_todos_due_date'), table_name='todos')
    op.drop_index(op.f('ix_todos_priority'), table_name='todos')
    op.drop_index(op.f('ix_todos_is_completed'), table_name='todos')
    op.drop_index(op.f('ix_todos_created_at'), table_name='todos')
    op.drop_index(op.f('ix_todos_user_id'), table_name='todos')
    op.drop_table('todos')

    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.drop_table('users')
