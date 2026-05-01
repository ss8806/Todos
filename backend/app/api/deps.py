import uuid
import logging
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.db import get_db
from app.core.security import decode_access_token
from app.crud import crud_user
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/token")
logger = logging.getLogger("app")

async def get_current_user(
    db: AsyncSession = Depends(get_db),
    token: str = Depends(oauth2_scheme)
) -> User:
    payload = decode_access_token(token)
    if payload is None:
        logger.warning("JWT decode failed: invalid or expired token")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="認証情報を検証できませんでした",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user_id_str: str = payload.get("sub")
    if user_id_str is None:
        logger.warning("JWT decode failed: missing 'sub' claim")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="トークンが無効です")

    try:
        user_id = uuid.UUID(user_id_str)
    except ValueError:
        logger.warning(f"JWT decode failed: invalid UUID in sub claim: {user_id_str}")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="トークンが無効です")

    user = await crud_user.get_user_by_id(db, user_id=user_id)
    if user is None:
        logger.warning(f"User not found for ID: {user_id}")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="ユーザーが見つかりません")
    return user
