import uuid
from datetime import datetime, timezone
from typing import Optional, TYPE_CHECKING
import sqlalchemy as sa
from sqlalchemy import Column, DateTime
from sqlmodel import Field, Relationship, Index
from app.schemas.todo import TodoBase

if TYPE_CHECKING:
    from app.models.user import User


class Todo(TodoBase, table=True):
    __tablename__ = "todos"
    __table_args__ = (
        Index("ix_todos_created_at", "created_at"),
        Index("ix_todos_is_completed", "is_completed"),
        Index("ix_todos_priority", "priority"),
        Index("ix_todos_due_date", "due_date"),
    )

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", nullable=False, index=True)
    created_at: datetime = Field(
        sa_column=Column(
            DateTime(timezone=True), server_default=sa.text("now()"), nullable=False
        ),
        default_factory=lambda: datetime.now(timezone.utc),
    )
    updated_at: datetime = Field(
        sa_column=Column(
            DateTime(timezone=True), server_default=sa.text("now()"), nullable=False
        ),
        default_factory=lambda: datetime.now(timezone.utc),
    )

    user: Optional["User"] = Relationship(back_populates="todos")
