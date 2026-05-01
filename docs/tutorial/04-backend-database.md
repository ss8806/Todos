# 04. データベース層の実装

この章では、SQLModel を使ったデータベースモデルの定義、非同期DB接続の設定、Alembic マイグレーションの導入を行います。

## 1. 設定管理（core/config.py）

まず、環境変数やアプリケーション設定を管理するモジュールを作成します。

```python
# backend/app/core/config.py
import os
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "Todo API"
    PROJECT_VERSION: str = "0.1.0"
    PROJECT_DESCRIPTION: str = "Todo Management API System"
    API_V1_STR: str = "/api/v1"

    # 実行環境
    ENVIRONMENT: str = "development"

    @property
    def is_development(self) -> bool:
        return self.ENVIRONMENT == "development"

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == "production"

    # データベース設定（環境変数から読み込む、デフォルトはローカルDB）
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

    # JWT設定（本番環境では必ず環境変数から設定）
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # CORS設定
    BACKEND_CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    # レート制限
    RATE_LIMIT_DEFAULT: str = os.getenv("RATE_LIMIT_DEFAULT", "100/minute")
    RATE_LIMIT_LOGIN: str = os.getenv("RATE_LIMIT_LOGIN", "5/minute")
    RATE_LIMIT_REGISTER: str = os.getenv("RATE_LIMIT_REGISTER", "5/minute")

    # メール設定
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

ポイント：
- `pydantic-settings` を使うと、環境変数や `.env` ファイルから自動で設定を読み込めます
- `async_database_url` プロパティで非同期接続用のURLを動的に構築
- `extra="ignore"` で未定義の環境変数を無視し、エラーを防ぎます

## 2. データベース接続設定（core/db.py）

```python
# backend/app/core/db.py
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlmodel import SQLModel
from app.core.config import settings

# 非同期エンジンの作成
engine = create_async_engine(
    settings.async_database_url,
    echo=settings.is_development,  # 開発環境ではSQLをログ出力
    future=True,
)

# 非同期セッションファクトリ
AsyncSessionLocal = sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def get_db() -> AsyncSession:
    """依存関係注入（Dependency Injection）用のDBセッション取得関数"""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
```

ポイント：
- `create_async_engine` で非同期対応のSQLAlchemyエンジンを作成
- `asyncpg` ドライバを使うため、URLに `postgresql+asyncpg://` を指定
- `get_db()` は FastAPI の `Depends` で使用し、リクエストごとにセッションを生成・破棄

## 3. Pydantic スキーマの定義

SQLModel は Pydantic と SQLAlchemy を統合したライブラリです。モデルを定義する前に、まずスキーマ（入出力の型）を定義します。

### ユーザー関連スキーマ

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

### Todo関連スキーマ

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

## 4. SQLModel モデルの定義

### ユーザーモデル

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

### Todoモデル

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

ポイント：
- `table=True` を指定することで、SQLAlchemyのテーブルモデルとして機能
- `Relationship` でユーザーモデルとの双方向リレーションを定義
- `Index` でよく検索するカラムにインデックスを設定（パフォーマンス最適化）
- `DateTime(timezone=True)` でタイムゾーン対応の日時を保存

## 5. Alembic マイグレーションの設定

Alembic は SQLAlchemy のマイグレーションツールです。SQLModel とも連携できます。

### 初期化

```bash
cd backend
uv run alembic init migrations
```

### alembic.ini の編集

`alembic.ini` の `sqlalchemy.url` を環境変数から読み込むように変更します：

```ini
# alembic.ini
[alembic]
script_location = migrations
prepend_sys_path = .

# SQLAlchemyデータベースURLはenv.pyで設定するため、ここでは空にしておく
# sqlalchemy.url = driver://user:pass@localhost/dbname
```

### migrations/env.py の編集

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

# モデルをインポートしてメタデータに登録
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

ポイント：
- 非同期エンジンに対応するため `async_engine_from_config` を使用
- マイグレーション実行時は同期ドライバ（psycopg2）を使用（Alembicの制約）
- モデルをインポートして `SQLModel.metadata` にテーブル定義を登録

### 初期マイグレーションの作成

```bash
cd backend
uv run alembic revision --autogenerate -m "initial schema"
```

`migrations/versions/` 以下にマイグレーションファイルが生成されます。

### マイグレーションの実行

```bash
uv run alembic upgrade head
```

または just コマンドを使用：

```bash
just db-migrate
```

## 6. 動作確認

この時点で、以下の構造になっていることを確認してください：

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

## 次のステップ

データベース層が整ったら、[05章: JWT認証](05-backend-auth.md) でユーザー認証機能を実装します。
