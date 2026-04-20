"""
データベースインデックスの追加

Revision ID: add_indexes
Revises: 
Create Date: 2026-04-20

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'add_indexes'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """インデックスの追加"""
    # todos テーブルのインデックス
    op.create_index('ix_todos_user_id', 'todos', ['user_id'])
    op.create_index('ix_todos_created_at', 'todos', ['created_at'])
    op.create_index('ix_todos_is_completed', 'todos', ['is_completed'])
    op.create_index('ix_todos_priority', 'todos', ['priority'])
    op.create_index('ix_todos_due_date', 'todos', ['due_date'])
    
    # users テーブルのインデックス
    op.create_index('ix_users_username', 'users', ['username'])


def downgrade() -> None:
    """インデックスの削除"""
    op.drop_index('ix_todos_due_date', table_name='todos')
    op.drop_index('ix_todos_priority', table_name='todos')
    op.drop_index('ix_todos_is_completed', table_name='todos')
    op.drop_index('ix_todos_created_at', table_name='todos')
    op.drop_index('ix_todos_user_id', table_name='todos')
    op.drop_index('ix_users_username', table_name='users')
