# 04. Database Layer Implementation

This chapter covers defining database models with SQLModel, configuring asynchronous DB connections, and introducing Alembic migrations.

## 1. Configuration Management (core/config.py)

First, create a module to manage environment variables and application settings.

```python
# backend/app/core/config.py
import os
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "Todo API"
    PROJECT_VERSION: str = "0.1.0"
    PROJECT_DESCRIPTION: str = "Todo Management API System"
    API_V1_STR: str = "/api/v1"

    # Execution environment
    ENVIRONMENT: str = "development"

    @property
    def is_development(self) -> bool:
        return self.ENVIRONMENT == "development"

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == "production"

    # Database settings (read from environment variables, default is local DB)
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "password"
    POSTGRES_SERVER: str = "127.0.0.1"
    POSTGRES_PORT: str = "5432"
    POSTGRES_DB: str = "tododb"

    DATABASE_URL: str | None = None

    @property
    def async_database_url(self) -> str:
        if self.DATABASE_URL:
            return self.DATABASE_URL
        return (
            f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    # JWT settings (always set from environment variables in production)
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # CORS settings
    BACKEND_CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    # Rate limiting
    RATE_LIMIT_DEFAULT: str = os.getenv("RATE_LIMIT_DEFAULT", "100/minute")
    RATE_LIMIT_LOGIN: str = os.getenv("RATE_LIMIT_LOGIN", "5/minute")
    RATE_LIMIT_REGISTER: str = os.getenv("RATE_LIMIT_REGISTER", "5/minute")

    # Email settings
    SMTP_HOST: str = os.getenv("SMTP_HOST", "localhost")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "1025"))
    MAIL_FROM: str = os.getenv("MAIL_FROM", "noreply@todoapp.dev")
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:3000")
    RESET_TOKEN_EXPIRE_HOURS: int = int(os.getenv("RESET_TOKEN_EXPIRE_HOURS", "24"))

    model_config = SettingsConfigDict(
        env_file=os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))),
            ".env"
        ),
        extra="ignore"
    )


settings = Settings()
```

Key points:
- Using `pydantic-settings`, settings are automatically loaded from environment variables or `.env` files
- `async_database_url` property dynamically constructs the URL for asynchronous connections
- `extra="ignore"` ignores undefined environment variables to prevent errors

## 2. Database Connection Settings (core/db.py)

```python
# backend/app/core/db.py
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlmodel import SQLModel
from app.core.config import settings

# Create asynchronous engine
engine = create_async_engine(
    settings.async_database_url,
    echo=settings.is_development,  # Log SQL in development environment
    future=True,
)

# Asynchronous session factory
AsyncSessionLocal = sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def get_db() -> AsyncSession:
    """DB session acquisition function for Dependency Injection"""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
```

Key points:
- Create an SQLAlchemy engine with asynchronous support using `create_async_engine`
- Specify `postgresql+asyncpg://` in the URL since we use the `asyncpg` driver
- `get_db()` is used with FastAPI's `Depends` to generate and destroy sessions per request

## 3. Pydantic Schema Definitions

SQLModel is a library that integrates Pydantic and SQLAlchemy. Before defining models, first define schemas (input/output types).

### User-related schemas

```python
# backend/app/schemas/user.py
from pydantic import BaseModel, EmailStr, ConfigDict
import uuid


class UserBase(BaseModel):
    email: EmailStr

    model_config = ConfigDict(from_attributes=True)


class UserCreate(UserBase):
    password: str


class UserRead(UserBase):
    id: uuid.UUID
```

### Todo-related schemas

```python
# backend/app/schemas/todo.py
from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional, Literal
import uuid

PriorityEnum = Literal["high", "medium", "low"]


class TodoBase(BaseModel):
    title: str
    is_completed: bool = False
    priority: Optional[PriorityEnum] = "low"
    due_date: Optional[datetime] = None
    tags: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class TodoCreate(BaseModel):
    title: str
    priority: Optional[PriorityEnum] = None
    due_date: Optional[datetime] = None
    tags: Optional[str] = None


class TodoUpdate(BaseModel):
    title: Optional[str] = None
    is_completed: Optional[bool] = None
    priority: Optional[PriorityEnum] = None
    due_date: Optional[datetime] = None
    tags: Optional[str] = None


class TodoRead(TodoBase):
    id: uuid.UUID
    user_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
```

## 4. SQLModel Model Definitions

### User model

```python
# backend/app/models/user.py
import uuid
from typing import List, TYPE_CHECKING
from sqlmodel import Field, Relationship
from app.schemas.user import UserBase

if TYPE_CHECKING:
    from app.models.todo import Todo


class User(UserBase, table=True):
    __tablename__ = "users"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    hashed_password: str = Field(nullable=False)

    todos: List["Todo"] = Relationship(back_populates="user")
```

### Todo model

```python
# backend/app/models/todo.py
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
        Index('ix_todos_created_at', 'created_at'),
        Index('ix_todos_is_completed', 'is_completed'),
        Index('ix_todos_priority', 'priority'),
        Index('ix_todos_due_date', 'due_date'),
    )

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", nullable=False, index=True)
    created_at: datetime = Field(
        sa_column=Column(
            DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False
        ),
        default_factory=lambda: datetime.now(timezone.utc)
    )
    updated_at: datetime = Field(
        sa_column=Column(
            DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False
        ),
        default_factory=lambda: datetime.now(timezone.utc)
    )

    user: Optional["User"] = Relationship(back_populates="todos")
```

Key points:
- Specify `table=True` to function as an SQLAlchemy table model
- Define bidirectional relationship with the user model using `Relationship`
- Set indexes on frequently searched columns with `Index` (performance optimization)
- Save timezone-aware datetime with `DateTime(timezone=True)`

## 5. Alembic Migration Settings

Alembic is SQLAlchemy's migration tool. It can also work with SQLModel.

### Initialization

```bash
cd backend
uv run alembic init migrations
```

### Edit alembic.ini

Change `alembic.ini` to load `sqlalchemy.url` from environment variables:

```ini
# alembic.ini
[alembic]
script_location = migrations
prepend_sys_path = .

# SQLAlchemy database URL is set in env.py, so leave it empty here
# sqlalchemy.url = driver://user:pass@localhost/dbname
```

### Edit migrations/env.py

```python
# backend/migrations/env.py
import asyncio
from logging.config import fileConfig

from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config
from alembic import context

from app.core.config import settings
from app.core.db import engine
from sqlmodel import SQLModel

# Import models and register with metadata
from app.models.user import User  # noqa
from app.models.todo import Todo  # noqa

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = SQLModel.metadata


def get_url():
    return settings.async_database_url.replace("+asyncpg", "+psycopg2")


def run_migrations_offline() -> None:
    url = get_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata)

    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    configuration = config.get_section(config.config_ini_section, {})
    configuration["sqlalchemy.url"] = get_url()

    connectable = async_engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
```

Key points:
- Use `async_engine_from_config` to support asynchronous engines
- Use synchronous driver (psycopg2) during migration execution (Alembic constraint)
- Import models and register table definitions with `SQLModel.metadata`

### Create initial migration

```bash
cd backend
uv run alembic revision --autogenerate -m "initial schema"
```

A migration file will be generated under `migrations/versions/`.

### Run migration

```bash
uv run alembic upgrade head
```

Or use the just command:

```bash
just db-migrate
```

## 6. Verification

At this point, please verify that you have the following structure:

```
backend/
├── app/
│   ├── __init__.py
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py
│   │   └── db.py
│   ├── models/
│   │   ├── __init__.py
│   │   ├── user.py
│   │   └── todo.py
│   └── schemas/
│       ├── __init__.py
│       ├── user.py
│       └── todo.py
├── migrations/
│   ├── env.py
│   ├── script.py.mako
│   └── versions/
│       └── xxxxxxxx_initial_schema.py
└── alembic.ini
```

## Next Steps

Once the database layer is ready, let's implement the user authentication feature in [Chapter 05: JWT Authentication](05-backend-auth.md).
