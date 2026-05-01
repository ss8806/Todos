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

@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED, summary="ユーザー登録", response_description="登録されたユーザー情報")
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

@router.post("/token", response_model=Token, summary="ログインアクセストークン取得", response_description="アクセストークン")
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
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(
        data={"sub": str(user.id)}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}


@router.post(
    "/forgot-password",
    status_code=status.HTTP_200_OK,
    summary="パスワードリセットメール送信",
    response_description="リセットメール送信結果"
)
@limiter.limit(settings.RATE_LIMIT_FORGOT_PASSWORD)
async def forgot_password(
    request: Request,
    db: AsyncSession = Depends(deps.get_db),
    data: ForgotPasswordRequest = Body(...)
) -> Any:
    """パスワードリセットメールを送信する（ユーザーが存在しなくても200を返す）"""
    user = await crud_user.get_user_by_email(db, email=data.email)
    if user:
        # 既存のトークンを無効化
        await crud_password_reset.invalidate_existing_tokens(db, user.id)
        # 新しいトークンを作成
        _, raw_token = await crud_password_reset.create_reset_token(db, user.id)
        # メール送信
        await send_reset_password_email(user.email, raw_token)
    return {"message": "パスワードリセットのメールを送信しました。メールボックスをご確認ください。"}


@router.post(
    "/reset-password",
    status_code=status.HTTP_200_OK,
    summary="パスワードリセット",
    response_description="パスワード変更結果"
)
@limiter.limit(settings.RATE_LIMIT_RESET_PASSWORD)
async def reset_password(
    request: Request,
    db: AsyncSession = Depends(deps.get_db),
    data: ResetPasswordRequest = Body(...)
) -> Any:
    """パスワードリセットトークンを検証し、新しいパスワードを設定する"""
    token = await crud_password_reset.verify_reset_token(db, data.token)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="無効または期限切れのトークンです。",
        )

    # ユーザーを取得
    user = await crud_user.get_user_by_id(db, user_id=token.user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="ユーザーが見つかりません。",
        )

    # 新しいパスワードを設定
    user.hashed_password = security.get_password_hash(data.new_password)
    await db.commit()

    # トークンを使用済みにする
    await crud_password_reset.mark_token_used(db, token)

    return {"message": "パスワードが正常に変更されました。新しいパスワードでログインしてください。"}
