import uuid
import secrets
import hashlib
from datetime import datetime, timezone, timedelta
from sqlalchemy import Column, DateTime
from sqlmodel import SQLModel, Field

from app.core.config import settings


def generate_reset_token() -> str:
    """安全なランダムトークンを生成する"""
    return secrets.token_urlsafe(32)


def hash_token(token: str) -> str:
    """トークンをSHA-256でハッシュする"""
    return hashlib.sha256(token.encode()).hexdigest()


class PasswordResetToken(SQLModel, table=True):
    __tablename__ = "password_reset_tokens"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", nullable=False)
    token_hash: str = Field(nullable=False, index=True)
    expires_at: datetime = Field(
        sa_column=Column(DateTime(timezone=True), nullable=False)
    )
    used: bool = Field(default=False, nullable=False)
    created_at: datetime = Field(
        sa_column=Column(DateTime(timezone=True), nullable=False),
        default_factory=lambda: datetime.now(timezone.utc),
    )

    @classmethod
    def create_for_user(cls, user_id: uuid.UUID) -> tuple["PasswordResetToken", str]:
        """ユーザー用の新しいリセットトークンを生成する"""
        raw_token = generate_reset_token()
        token_hash = hash_token(raw_token)
        expires_at = datetime.now(timezone.utc) + timedelta(
            hours=settings.RESET_TOKEN_EXPIRE_HOURS
        )
        return (
            cls(user_id=user_id, token_hash=token_hash, expires_at=expires_at),
            raw_token,
        )

    def is_valid(self) -> bool:
        """トークンが有効かどうかを確認する"""
        if self.used:
            return False
        return datetime.now(timezone.utc) < self.expires_at
