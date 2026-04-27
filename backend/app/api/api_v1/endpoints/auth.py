from datetime import timedelta
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession

from app.api import deps
from app.core import security
from app.core.config import settings
from app.core.limiter import limiter
from app.crud import crud_user
from app.schemas.user import UserCreate, UserRead
from app.schemas.token import Token

router = APIRouter(tags=["auth"])

@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED, summary="ユーザー登録", response_description="登録されたユーザー情報")
@limiter.limit(settings.RATE_LIMIT_REGISTER)
async def register(
    request: Request,
    *,
    db: AsyncSession = Depends(deps.get_db),
    user_in: UserCreate
) -> Any:
    user = await crud_user.get_user_by_username(db, username=user_in.username)
    if user:
        raise HTTPException(
            status_code=400,
            detail="このユーザー名は既に使用されています",
        )
    user = await crud_user.create_user(db, user=user_in)
    return user

@router.post("/token", response_model=Token, summary="ログインアクセストークン取得", response_description="アクセストークン")
@limiter.limit(settings.RATE_LIMIT_LOGIN)
async def login_for_access_token(
    request: Request,
    db: AsyncSession = Depends(deps.get_db),
    form_data: OAuth2PasswordRequestForm = Depends()
) -> Any:
    user = await crud_user.get_user_by_username(db, username=form_data.username)
    if not user or not security.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}
