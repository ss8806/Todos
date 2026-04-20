from typing import Any
from fastapi import APIRouter, Depends
from app.api import deps
from app.models.user import User
from app.schemas.user import UserRead

router = APIRouter(tags=["users"])

@router.get("/me", response_model=UserRead, summary="現在のユーザー情報取得", response_description="ユーザー情報")
async def read_users_me(
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    return current_user
