import uuid
from sqlmodel import SQLModel, Field
from datetime import datetime
from typing import Optional
from enum import Enum

class PriorityEnum(str, Enum):
    """優先度"""
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

class TodoBase(SQLModel):
    title: str = Field(max_length=255, nullable=False)
    is_completed: bool = Field(default=False)
    priority: PriorityEnum = Field(default=PriorityEnum.LOW)
    due_date: Optional[datetime] = Field(default=None)
    tags: Optional[str] = Field(default=None, max_length=500)

class TodoCreate(TodoBase):
    pass

class TodoUpdate(SQLModel):
    title: Optional[str] = Field(default=None, max_length=255)
    is_completed: Optional[bool] = None
    priority: Optional[PriorityEnum] = None
    due_date: Optional[datetime] = None
    tags: Optional[str] = None

class TodoRead(TodoBase):
    id: uuid.UUID
    user_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

class TodoCountResponse(SQLModel):
    total: int

class TodoDeleteResponse(SQLModel):
    status: str
