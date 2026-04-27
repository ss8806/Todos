from datetime import datetime, timezone
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.models.password_reset import PasswordResetToken, hash_token


async def create_reset_token(db: AsyncSession, user_id: UUID) -> tuple[PasswordResetToken, str]:
    """新しいパスワードリセットトークンを作成する"""
    token_obj, raw_token = PasswordResetToken.create_for_user(user_id)
    db.add(token_obj)
    await db.commit()
    await db.refresh(token_obj)
    return token_obj, raw_token


async def get_token_by_hash(db: AsyncSession, token_hash: str) -> PasswordResetToken | None:
    """トークンハッシュからトークンを取得する"""
    statement = select(PasswordResetToken).where(PasswordResetToken.token_hash == token_hash)
    result = await db.execute(statement)
    return result.scalar_one_or_none()


async def verify_reset_token(db: AsyncSession, raw_token: str) -> PasswordResetToken | None:
    """生のトークンを検証し、有効なトークンオブジェクトを返す"""
    token_hash = hash_token(raw_token)
    token = await get_token_by_hash(db, token_hash)
    if token is None or not token.is_valid():
        return None
    return token


async def mark_token_used(db: AsyncSession, token: PasswordResetToken) -> None:
    """トークンを使用済みにする"""
    token.used = True
    await db.commit()


async def invalidate_existing_tokens(db: AsyncSession, user_id: UUID) -> None:
    """ユーザーの既存の未使用トークンを無効化する"""
    statement = (
        select(PasswordResetToken)
        .where(
            PasswordResetToken.user_id == user_id,
            PasswordResetToken.used == False,
            PasswordResetToken.expires_at > datetime.now(timezone.utc)
        )
    )
    result = await db.execute(statement)
    tokens = result.scalars().all()
    for token in tokens:
        token.used = True
    if tokens:
        await db.commit()
