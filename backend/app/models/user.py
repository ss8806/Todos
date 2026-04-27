import uuid
from typing import List, TYPE_CHECKING
from sqlmodel import Field, Relationship, Index
from app.schemas.user import UserBase

if TYPE_CHECKING:
    from app.models.todo import Todo

class User(UserBase, table=True):
    __tablename__ = "users"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    hashed_password: str = Field(nullable=False)

    todos: List["Todo"] = Relationship(back_populates="user")
