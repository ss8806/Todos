import uuid
from sqlmodel import SQLModel, Field

class UserBase(SQLModel):
    username: str = Field(unique=True, index=True, nullable=False, max_length=50)

class UserCreate(UserBase):
    password: str

class UserRead(UserBase):
    id: uuid.UUID
