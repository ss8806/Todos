# 05. JWT認証の実装

この章では、パスワードハッシュ化、JWTトークンの生成・検証、ユーザー登録・ログイン・パスワードリセットAPIを実装します。

## 1. セキュリティモジュール（core/security.py）

パスワードのハッシュ化とJWTトークンの生成・検証を担当するモジュールです。

```python
# backend/app/core/security.py
from datetime import datetime, timedelta, timezone
from typing import Optional, Any
from jose import JWTError, jwt
from passlib.context import CryptContext
from app.core.config import settings

# Argon2によるパスワードハッシュ化
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """平文パスワードとハッシュを比較"""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """パスワードをハッシュ化"""
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """JWTアクセストークンを生成"""
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> Optional[dict[str, Any]]:
    """JWTトークンを検証してペイロードを取得"""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        return None
```

ポイント：
- `passlib` の `CryptContext` で Argon2 を使用（現代的で推奨されるハッシュアルゴリズム）
- `python-jose` でJWTのエンコード/デコードを行う
- トークンの有効期限は設定値（デフォルト30分）で管理

## 2. 認証用スキーマ

```python
# backend/app/schemas/token.py
from pydantic import BaseModel


class Token(BaseModel):
    access_token: str
    token_type: str
```

```python
# backend/app/schemas/auth.py
from pydantic import BaseModel, EmailStr


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str
```

## 3. CRUD操作（crud/crud_user.py）

```python
# backend/app/crud/crud_user.py
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.user import User
from app.schemas.user import UserCreate
from app.core import security


async def get_user_by_email(db: AsyncSession, email: str) -> User | None:
    result = await db.execute(select(User).where(User.email == email))
    return result.scalar_one_or_none()


async def get_user_by_id(db: AsyncSession, user_id) -> User | None:
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


async def create_user(db: AsyncSession, user: UserCreate) -> User:
    hashed_password = security.get_password_hash(user.password)
    db_user = User(email=user.email, hashed_password=hashed_password)
    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)
    return db_user
```

## 4. パスワードリセット用CRUD（crud/crud_password_reset.py）

```python
# backend/app/crud/crud_password_reset.py
import secrets
from datetime import datetime, timedelta, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from app.models.password_reset import PasswordResetToken


async def create_reset_token(db: AsyncSession, user_id) -> tuple[PasswordResetToken, str]:
    """リセットトークンを生成。生のトークン文字列とDBモデルを返す"""
    raw_token = secrets.token_urlsafe(32)

    db_token = PasswordResetToken(
        user_id=user_id,
        token=raw_token,
        expires_at=datetime.now(timezone.utc) + timedelta(hours=24),
    )
    db.add(db_token)
    await db.commit()
    await db.refresh(db_token)
    return db_token, raw_token


async def verify_reset_token(db: AsyncSession, token: str) -> PasswordResetToken | None:
    """トークンを検証（有効期限内かつ未使用）"""
    result = await db.execute(
        select(PasswordResetToken).where(
            PasswordResetToken.token == token,
            PasswordResetToken.used == False,
            PasswordResetToken.expires_at > datetime.now(timezone.utc),
        )
    )
    return result.scalar_one_or_none()


async def mark_token_used(db: AsyncSession, token: PasswordResetToken) -> None:
    token.used = True
    await db.commit()


async def invalidate_existing_tokens(db: AsyncSession, user_id) -> None:
    """ユーザーに紐づく既存の有効トークンを無効化"""
    await db.execute(
        update(PasswordResetToken)
        .where(
            PasswordResetToken.user_id == user_id,
            PasswordResetToken.used == False,
        )
        .values(used=True)
    )
    await db.commit()
```

## 5. パスワードリセットトークンモデル

```python
# backend/app/models/password_reset.py
import uuid
from datetime import datetime, timezone
from sqlmodel import Field, SQLModel
import sqlalchemy as sa
from sqlalchemy import Column, DateTime


class PasswordResetToken(SQLModel, table=True):
    __tablename__ = "password_reset_tokens"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", nullable=False)
    token: str = Field(nullable=False, unique=True)
    expires_at: datetime = Field(
        sa_column=Column(DateTime(timezone=True), nullable=False)
    )
    used: bool = Field(default=False)
    created_at: datetime = Field(
        sa_column=Column(
            DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False
        ),
        default_factory=lambda: datetime.now(timezone.utc)
    )
```

## 6. API依存性（api/deps.py）

現在のユーザーを取得する依存性注入関数です。

```python
# backend/app/api/deps.py
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.db import get_db
from app.core import security
from app.crud import crud_user

# OAuth2のトークンURLを指定
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/token")


async def get_current_user(
    db: AsyncSession = Depends(get_db),
    token: str = Depends(oauth2_scheme)
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="認証情報が無効です",
        headers={"WWW-Authenticate": "Bearer"},
    )

    payload = security.decode_access_token(token)
    if payload is None:
        raise credentials_exception

    user_id = payload.get("sub")
    if user_id is None:
        raise credentials_exception

    user = await crud_user.get_user_by_id(db, user_id)
    if user is None:
        raise credentials_exception

    return user
```

## 7. レート制限の設定（core/limiter.py）

```python
# backend/app/core/limiter.py
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
```

## 8. 認証APIエンドポイント

```python
# backend/app/api/api_v1/endpoints/auth.py
from datetime import timedelta
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status, Request, Body
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession

from app.api import deps
from app.core import security
from app.core.config import settings
from app.core.limiter import limiter
from app.core.mail import send_reset_password_email
from app.crud import crud_user, crud_password_reset
from app.schemas.user import UserCreate, UserRead
from app.schemas.token import Token
from app.schemas.auth import ForgotPasswordRequest, ResetPasswordRequest

router = APIRouter(tags=["auth"])


@router.post(
    "/register",
    response_model=UserRead,
    status_code=status.HTTP_201_CREATED,
    summary="ユーザー登録"
)
@limiter.limit(settings.RATE_LIMIT_REGISTER)
async def register(
    request: Request,
    *,
    db: AsyncSession = Depends(deps.get_db),
    user_in: UserCreate
) -> Any:
    user = await crud_user.get_user_by_email(db, email=user_in.email)
    if user:
        raise HTTPException(
            status_code=400,
            detail="このメールアドレスは既に登録されています",
        )
    user = await crud_user.create_user(db, user=user_in)
    return user


@router.post(
    "/token",
    response_model=Token,
    summary="ログイン"
)
@limiter.limit(settings.RATE_LIMIT_LOGIN)
async def login_for_access_token(
    request: Request,
    db: AsyncSession = Depends(deps.get_db),
    form_data: OAuth2PasswordRequestForm = Depends()
) -> Any:
    user = await crud_user.get_user_by_email(db, email=form_data.username)
    if not user or not security.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="メールアドレスまたはパスワードが正しくありません",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(
        data={"sub": str(user.id)},
        expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}


@router.post(
    "/forgot-password",
    status_code=status.HTTP_200_OK,
    summary="パスワードリセットメール送信"
)
@limiter.limit(settings.RATE_LIMIT_FORGOT_PASSWORD)
async def forgot_password(
    request: Request,
    db: AsyncSession = Depends(deps.get_db),
    data: ForgotPasswordRequest = Body(...)
) -> Any:
    """ユーザーが存在しなくても200を返す（セキュリティ配慮）"""
    user = await crud_user.get_user_by_email(db, email=data.email)
    if user:
        await crud_password_reset.invalidate_existing_tokens(db, user.id)
        _, raw_token = await crud_password_reset.create_reset_token(db, user.id)
        await send_reset_password_email(user.email, raw_token)
    return {
        "message": "パスワードリセットのメールを送信しました。メールボックスをご確認ください。"
    }


@router.post(
    "/reset-password",
    status_code=status.HTTP_200_OK,
    summary="パスワードリセット"
)
@limiter.limit(settings.RATE_LIMIT_RESET_PASSWORD)
async def reset_password(
    request: Request,
    db: AsyncSession = Depends(deps.get_db),
    data: ResetPasswordRequest = Body(...)
) -> Any:
    token = await crud_password_reset.verify_reset_token(db, data.token)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="無効または期限切れのトークンです。",
        )

    user = await crud_user.get_user_by_id(db, user_id=token.user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="ユーザーが見つかりません。",
        )

    user.hashed_password = security.get_password_hash(data.new_password)
    await db.commit()
    await crud_password_reset.mark_token_used(db, token)

    return {
        "message": "パスワードが正常に変更されました。新しいパスワードでログインしてください。"
    }
```

## 9. APIルーターの統合

```python
# backend/app/api/api_v1/api.py
from fastapi import APIRouter
from app.api.api_v1.endpoints import auth

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth")
```

```python
# backend/app/api/deps.py の get_db 関数
from app.core.db import get_db as get_db_dependency

# エイリアスとして公開
get_db = get_db_dependency
```

## セキュリティのベストプラクティス

1. **パスワードハッシュ化**: Argon2を使用し、平文パスワードを一切保存しない
2. **レート制限**: 認証エンドポイントにレート制限を適用し、ブルートフォース攻撃を防止
3. **存在確認の曖昧化**: パスワードリセット時、ユーザーが存在しない場合も同じメッセージを返す
4. **トークン有効期限**: JWTは30分、パスワードリセットトークンは24時間で期限切れ
5. **Secure Cookie**: HTTPS環境ではCookieにSecure属性を付与（フロントエンドで実装）

## 次のステップ

認証機能が整ったら、[06章: Todo API](06-backend-todo-api.md) でTodoのCRUD操作を実装します。
