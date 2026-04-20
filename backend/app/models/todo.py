import uuid
from datetime import datetime, timezone
from typing import Optional, TYPE_CHECKING
from sqlmodel import Field, Relationship
from app.schemas.todo import TodoBase, PriorityEnum

if TYPE_CHECKING:
    from app.models.user import User

class Todo(TodoBase, table=True):
    __tablename__ = "todos"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", nullable=False)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc).replace(tzinfo=None))

    user: Optional["User"] = Relationship(back_populates="todos")
