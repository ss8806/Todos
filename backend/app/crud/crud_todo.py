import uuid
from typing import Optional
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select, col
from app.models.todo import Todo
from app.schemas.todo import TodoCreate, PriorityEnum

async def get_todos(
    db: AsyncSession, 
    user_id: uuid.UUID,
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    is_completed: Optional[bool] = None,
    priority: Optional[PriorityEnum] = None,
    tags: Optional[str] = None,
    sort_by: str = "created_at",
    sort_order: str = "desc"
):
    """
    TODO一覧取得（検索・フィルタリング・ページネーション対応）
    """
    statement = select(Todo).where(Todo.user_id == user_id)
    
    # 検索フィルタ
    if search:
        statement = statement.where(Todo.title.contains(search))
    
    # 完了状態フィルタ
    if is_completed is not None:
        statement = statement.where(Todo.is_completed == is_completed)
    
    # 優先度フィルタ
    if priority:
        statement = statement.where(Todo.priority == priority)
    
    # タグフィルタ（部分一致）
    if tags:
        tag_list = [tag.strip() for tag in tags.split(",")]
        for tag in tag_list:
            statement = statement.where(Todo.tags.contains(tag))
    
    # ソート
    if sort_by == "priority":
        # 優先度の高い順 (high > medium > low)
        if sort_order == "desc":
            statement = statement.order_by(
                col(Todo.priority).desc()
            )
        else:
            statement = statement.order_by(
                col(Todo.priority).asc()
            )
    elif sort_by == "due_date":
        if sort_order == "desc":
            statement = statement.order_by(col(Todo.due_date).desc())
        else:
            statement = statement.order_by(col(Todo.due_date).asc())
    else:  # created_at
        if sort_order == "desc":
            statement = statement.order_by(col(Todo.created_at).desc())
        else:
            statement = statement.order_by(col(Todo.created_at).asc())
    
    # ページネーション
    statement = statement.offset(skip).limit(limit)
    
    result = await db.execute(statement)
    return result.scalars().all()

async def create_todo(db: AsyncSession, todo: TodoCreate, user_id: uuid.UUID):
    db_todo = Todo.model_validate(todo, update={"user_id": user_id})
    db.add(db_todo)
    await db.commit()
    await db.refresh(db_todo)
    return db_todo

async def update_todo(
    db: AsyncSession,
    todo_id: uuid.UUID,
    user_id: uuid.UUID,
    title: Optional[str] = None,
    is_completed: Optional[bool] = None,
    priority: Optional[PriorityEnum] = None,
    due_date: Optional[datetime] = None,
    tags: Optional[str] = None
):
    """
    TODO更新（一部フィールドの更新に対応）
    """
    statement = select(Todo).where(Todo.id == todo_id, Todo.user_id == user_id)
    result = await db.execute(statement)
    db_todo = result.scalar_one_or_none()
    
    if db_todo:
        if title is not None:
            db_todo.title = title
        if is_completed is not None:
            db_todo.is_completed = is_completed
        if priority is not None:
            db_todo.priority = priority
        if due_date is not None:
            db_todo.due_date = due_date
        if tags is not None:
            db_todo.tags = tags

        db_todo.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)

        db.add(db_todo)
        await db.commit()
        await db.refresh(db_todo)

    return db_todo

async def delete_todo(db: AsyncSession, todo_id: uuid.UUID, user_id: uuid.UUID):
    statement = select(Todo).where(Todo.id == todo_id, Todo.user_id == user_id)
    result = await db.execute(statement)
    db_todo = result.scalar_one_or_none()
    if db_todo:
        await db.delete(db_todo)
        await db.commit()
    return db_todo
