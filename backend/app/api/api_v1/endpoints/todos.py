from typing import Any, List
import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api import deps
from app.crud import crud_todo
from app.models.user import User
from app.schemas.todo import TodoCreate, TodoRead, TodoUpdate

router = APIRouter(tags=["todos"])

@router.get("/", response_model=List[TodoRead], summary="TODO一覧取得", response_description="TODOリスト")
async def read_todos(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    todos = await crud_todo.get_todos(db, user_id=current_user.id)
    return todos

@router.post("/", response_model=TodoRead, summary="TODO作成", response_description="作成されたTODO")
async def create_todo(
    *,
    db: AsyncSession = Depends(deps.get_db),
    todo_in: TodoCreate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    todo = await crud_todo.create_todo(db, todo=todo_in, user_id=current_user.id)
    return todo

@router.put("/{id}", response_model=TodoRead, summary="TODO更新", response_description="更新されたTODO")
async def update_todo(
    *,
    db: AsyncSession = Depends(deps.get_db),
    id: uuid.UUID,
    todo_in: TodoUpdate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    todo = await crud_todo.update_todo(
        db, todo_id=id, is_completed=todo_in.is_completed, user_id=current_user.id
    )
    if not todo:
        raise HTTPException(status_code=404, detail="Todo not found")
    return todo

@router.delete("/{id}", summary="TODO削除", response_description="削除結果")
async def delete_todo(
    *,
    db: AsyncSession = Depends(deps.get_db),
    id: uuid.UUID,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    todo = await crud_todo.delete_todo(db, todo_id=id, user_id=current_user.id)
    return {"status": "success"}
