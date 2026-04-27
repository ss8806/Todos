import uuid
from pydantic import EmailStr
from sqlmodel import SQLModel, Field

class UserBase(SQLModel):
    email: EmailStr = Field(unique=True, index=True, nullable=False, max_length=255)

class UserCreate(UserBase):
    password: str

class UserRead(UserBase):
    id: uuid.UUID
