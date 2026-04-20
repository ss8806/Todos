import uuid
from sqlmodel import SQLModel, Field
from datetime import datetime

class TodoBase(SQLModel):
    title: str = Field(max_length=255, nullable=False)
    is_completed: bool = Field(default=False)

class TodoCreate(TodoBase):
    pass

class TodoUpdate(SQLModel):
    is_completed: bool

class TodoRead(TodoBase):
    id: uuid.UUID
    user_id: uuid.UUID
    created_at: datetime
