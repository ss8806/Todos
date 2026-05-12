# 05. JWT Authentication Implementation

This chapter covers implementing password hashing, JWT token generation/verification, and user registration/login/password reset APIs.

## 1. Security Module (core/security.py)

This module handles password hashing and JWT token generation/verification.

```python
# backend/app/core/security.py
from datetime import datetime, timedelta, timezone
from typing import Optional, Any
from jose import JWTError, jwt
from passlib.context import CryptContext
from app.core.config import settings

# Argon2 password hashing
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Compare plain text password with hash"""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Hash password"""
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Generate JWT access token"""
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
    """Verify JWT token and get payload"""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        return None
```

Key points:
- Use Argon2 with `passlib`'s `CryptContext` (modern and recommended hashing algorithm)
- Encode/decode JWT with `python-jose`
- Token expiration is managed by configuration value (default 30 minutes)

## 2. Authentication Schemas

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

## 3. CRUD Operations (crud/crud_user.py)

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

## 4. Password Reset CRUD (crud/crud_password_reset.py)

```python
# backend/app/crud/crud_password_reset.py
import secrets
from datetime import datetime, timedelta, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from app.models.password_reset import PasswordResetToken


async def create_reset_token(db: AsyncSession, user_id) -> tuple[PasswordResetToken, str]:
    """Generate reset token. Returns raw token string and DB model"""
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
    """Verify token (within expiration and unused)"""
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
    """Invalidate existing valid tokens associated with user"""
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

## 5. Password Reset Token Model

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

## 6. API Dependencies (api/deps.py)

Dependency injection function to get the current user.

```python
# backend/app/api/deps.py
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.db import get_db
from app.core import security
from app.crud import crud_user

# Specify OAuth2 token URL
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/token")


async def get_current_user(
    db: AsyncSession = Depends(get_db),
    token: str = Depends(oauth2_scheme)
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid authentication credentials",
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

## 7. Rate Limiting Settings (core/limiter.py)

```python
# backend/app/core/limiter.py
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
```

## 8. Authentication API Endpoints

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
    summary="User registration"
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
            detail="This email address is already registered",
        )
    user = await crud_user.create_user(db, user=user_in)
    return user


@router.post(
    "/token",
    response_model=Token,
    summary="Login"
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
            detail="Incorrect email address or password",
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
    summary="Send password reset email"
)
@limiter.limit(settings.RATE_LIMIT_FORGOT_PASSWORD)
async def forgot_password(
    request: Request,
    db: AsyncSession = Depends(deps.get_db),
    data: ForgotPasswordRequest = Body(...)
) -> Any:
    """Return 200 even if user doesn't exist (security consideration)"""
    user = await crud_user.get_user_by_email(db, email=data.email)
    if user:
        await crud_password_reset.invalidate_existing_tokens(db, user.id)
        _, raw_token = await crud_password_reset.create_reset_token(db, user.id)
        await send_reset_password_email(user.email, raw_token)
    return {
        "message": "Password reset email sent. Please check your mailbox."
    }


@router.post(
    "/reset-password",
    status_code=status.HTTP_200_OK,
    summary="Reset password"
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
            detail="Invalid or expired token.",
        )

    user = await crud_user.get_user_by_id(db, user_id=token.user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )

    user.hashed_password = security.get_password_hash(data.new_password)
    await db.commit()
    await crud_password_reset.mark_token_used(db, token)

    return {
        "message": "Password has been successfully changed. Please log in with your new password."
    }
```

## 9. API Router Integration

```python
# backend/app/api/api_v1/api.py
from fastapi import APIRouter
from app.api.api_v1.endpoints import auth

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth")
```

```python
# backend/app/api/deps.py get_db function
from app.core.db import get_db as get_db_dependency

# Expose as alias
get_db = get_db_dependency
```

## Security Best Practices

1. **Password hashing**: Use Argon2, never store plaintext passwords
2. **Rate limiting**: Apply rate limits to authentication endpoints to prevent brute force attacks
3. **Existence ambiguity**: Return the same message even if user doesn't exist during password reset
4. **Token expiration**: JWT expires in 30 minutes, password reset token expires in 24 hours
5. **Secure Cookie**: Add Secure attribute to Cookie in HTTPS environment (implemented in frontend)

## Next Steps

Once authentication is ready, let's implement Todo CRUD operations in [Chapter 06: Todo API](06-backend-todo-api.md).
