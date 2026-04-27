from typing import Any, List, Optional
import uuid
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api import deps
from app.crud import crud_todo
from app.models.user import User
from app.schemas.todo import TodoCreate, TodoRead, TodoUpdate, PriorityEnum

router = APIRouter(tags=["todos"])

@router.get("/count", summary="TODO件数取得", response_description="TODO件数")
async def read_todos_count(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
    search: Optional[str] = Query(default=None, description="検索キーワード"),
    is_completed: Optional[bool] = Query(default=None, description="完了状態でのフィルタ"),
    priority: Optional[PriorityEnum] = Query(default=None, description="優先度でのフィルタ"),
    tags: Optional[str] = Query(default=None, description="タグでのフィルタ（カンマ区切り）"),
) -> dict:
    total = await crud_todo.count_todos(
        db,
        user_id=current_user.id,
        search=search,
        is_completed=is_completed,
        priority=priority,
        tags=tags,
    )
    return {"total": total}

@router.get("/", response_model=List[TodoRead], summary="TODO一覧取得", response_description="TODOリスト")
async def read_todos(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
    skip: int = Query(default=0, ge=0, description="スキップする件数"),
    limit: int = Query(default=100, ge=1, le=100, description="取得件数"),
    search: Optional[str] = Query(default=None, description="検索キーワード"),
    is_completed: Optional[bool] = Query(default=None, description="完了状態でのフィルタ"),
    priority: Optional[PriorityEnum] = Query(default=None, description="優先度でのフィルタ"),
    tags: Optional[str] = Query(default=None, description="タグでのフィルタ（カンマ区切り）"),
    sort_by: str = Query(default="created_at", pattern="^(created_at|priority|due_date)$", description="ソート対象のフィールド"),
    sort_order: str = Query(default="desc", pattern="^(asc|desc)$", description="ソートオーダー"),
) -> Any:
    todos = await crud_todo.get_todos(
        db, 
        user_id=current_user.id,
        skip=skip,
        limit=limit,
        search=search,
        is_completed=is_completed,
        priority=priority,
        tags=tags,
        sort_by=sort_by,
        sort_order=sort_order
    )
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
        db,
        todo_id=id,
        user_id=current_user.id,
        title=todo_in.title,
        is_completed=todo_in.is_completed,
        priority=todo_in.priority,
        due_date=todo_in.due_date,
        tags=todo_in.tags
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
    if not todo:
        raise HTTPException(status_code=404, detail="Todo not found")
    return {"status": "success"}
