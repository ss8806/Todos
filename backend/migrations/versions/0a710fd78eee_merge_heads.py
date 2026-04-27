"""merge_heads

Revision ID: 0a710fd78eee
Revises: 4f4084d80ebd, add_indexes
Create Date: 2026-04-27 19:33:05.257941

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0a710fd78eee'
down_revision: Union[str, Sequence[str], None] = ('4f4084d80ebd', 'add_indexes')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
