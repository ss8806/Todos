# 06. Todo CRUD API Implementation

This chapter covers implementing Todo item create, read, update, delete (CRUD) APIs. Search, filtering, sorting, and pagination features are also implemented together.

## 1. Todo CRUD Operations

```python
# backend/app/crud/crud_todo.py
from typing import Optional, Sequence
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.orm import joinedload
from app.models.todo import Todo
from app.schemas.todo import TodoCreate, TodoUpdate


async def get_todos(
    db: AsyncSession,
    *,
    user_id,
    search: Optional[str] = None,
    is_completed: Optional[bool] = None,
    priority: Optional[str] = None,
    tags: Optional[str] = None,
    sort_by: str = "created_at",
    sort_order: str = "desc",
    skip: int = 0,
    limit: int = 100,
) -> Sequence[Todo]:
    """Get Todo list (with search, filter, sort, pagination support)"""
    query = select(Todo).where(Todo.user_id == user_id)

    # Search (title partial match)
    if search:
        query = query.where(Todo.title.ilike(f"%{search}%"))

    # Completion status filter
    if is_completed is not None:
        query = query.where(Todo.is_completed == is_completed)

    # Priority filter
    if priority:
        query = query.where(Todo.priority == priority)

    # Tag filter (partial match)
    if tags:
        query = query.where(Todo.tags.ilike(f"%{tags}%"))

    # Sort
    sort_column = getattr(Todo, sort_by, Todo.created_at)
    if sort_order == "desc":
        query = query.order_by(sort_column.desc())
    else:
        query = query.order_by(sort_column.asc())

    # Pagination
    query = query.offset(skip).limit(limit)

    result = await db.execute(query)
    return result.scalars().all()


async def count_todos(
    db: AsyncSession,
    *,
    user_id,
    search: Optional[str] = None,
    is_completed: Optional[bool] = None,
    priority: Optional[str] = None,
    tags: Optional[str] = None,
) -> int:
    """Get count of Todos matching filter criteria"""
    query = select(func.count(Todo.id)).where(Todo.user_id == user_id)

    if search:
        query = query.where(Todo.title.ilike(f"%{search}%"))
    if is_completed is not None:
        query = query.where(Todo.is_completed == is_completed)
    if priority:
        query = query.where(Todo.priority == priority)
    if tags:
        query = query.where(Todo.tags.ilike(f"%{tags}%"))

    result = await db.execute(query)
    return result.scalar()


async def get_todo(db: AsyncSession, todo_id, user_id) -> Todo | None:
    """Get specific Todo"""
    result = await db.execute(
        select(Todo).where(Todo.id == todo_id, Todo.user_id == user_id)
    )
    return result.scalar_one_or_none()


async def create_todo(db: AsyncSession, user_id, todo: TodoCreate) -> Todo:
    """Create new Todo"""
    db_todo = Todo(
        user_id=user_id,
        title=todo.title,
        priority=todo.priority or "low",
        due_date=todo.due_date,
        tags=todo.tags,
    )
    db.add(db_todo)
    await db.commit()
    await db.refresh(db_todo)
    return db_todo


async def update_todo(
    db: AsyncSession,
    db_todo: Todo,
    todo_update: TodoUpdate
) -> Todo:
    """Update Todo (supports partial updates)"""
    update_data = todo_update.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(db_todo, field, value)

    db.add(db_todo)
    await db.commit()
    await db.refresh(db_todo)
    return db_todo


async def delete_todo(db: AsyncSession, db_todo: Todo) -> None:
    """Delete Todo"""
    await db.delete(db_todo)
    await db.commit()
```

Key points:
- Case-insensitive partial match search with `ilike`
- Update only fields included in the request with `exclude_unset=True` (partial update)
- Efficient count retrieval with `func.count`

## 2. Todo API Endpoints

```python
# backend/app/api/api_v1/endpoints/todos.py
from typing import Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api import deps
from app.core.limiter import limiter
from app.core.config import settings
from app.crud import crud_todo
from app.models.user import User
from app.schemas.todo import TodoCreate, TodoRead, TodoUpdate

router = APIRouter(tags=["todos"])


@router.get("/", response_model=list[TodoRead], summary="Get Todo list")
@limiter.limit(settings.RATE_LIMIT_DEFAULT)
async def read_todos(
    request,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
    search: Optional[str] = Query(None, description="Title partial match search"),
    is_completed: Optional[bool] = Query(None, description="Completion status filter"),
    priority: Optional[str] = Query(None, description="Priority filter (high/medium/low)"),
    tags: Optional[str] = Query(None, description="Tag filter"),
    sort_by: str = Query("created_at", description="Sort field"),
    sort_order: str = Query("desc", description="Sort order (asc/desc)"),
    skip: int = Query(0, ge=0, description="Skip count"),
    limit: int = Query(100, ge=1, le=100, description="Max items to retrieve"),
) -> Any:
    todos = await crud_todo.get_todos(
        db,
        user_id=current_user.id,
        search=search,
        is_completed=is_completed,
        priority=priority,
        tags=tags,
        sort_by=sort_by,
        sort_order=sort_order,
        skip=skip,
        limit=limit,
    )
    return todos


@router.get("/count", summary="Get Todo count")
@limiter.limit(settings.RATE_LIMIT_DEFAULT)
async def count_todos(
    request,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
    search: Optional[str] = Query(None),
    is_completed: Optional[bool] = Query(None),
    priority: Optional[str] = Query(None),
    tags: Optional[str] = Query(None),
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


@router.post("/", response_model=TodoRead, status_code=status.HTTP_201_CREATED, summary="Create Todo")
@limiter.limit(settings.RATE_LIMIT_DEFAULT)
async def create_todo(
    request,
    *,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
    todo_in: TodoCreate
) -> Any:
    todo = await crud_todo.create_todo(db, user_id=current_user.id, todo=todo_in)
    return todo


@router.put("/{todo_id}", response_model=TodoRead, summary="Update Todo")
@limiter.limit(settings.RATE_LIMIT_DEFAULT)
async def update_todo(
    request,
    todo_id,
    *,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
    todo_in: TodoUpdate
) -> Any:
    todo = await crud_todo.get_todo(db, todo_id=todo_id, user_id=current_user.id)
    if not todo:
        raise HTTPException(status_code=404, detail="Todo not found")

    todo = await crud_todo.update_todo(db, db_todo=todo, todo_update=todo_in)
    return todo


@router.delete("/{todo_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete Todo")
@limiter.limit(settings.RATE_LIMIT_DEFAULT)
async def delete_todo(
    request,
    todo_id,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> None:
    todo = await crud_todo.get_todo(db, todo_id=todo_id, user_id=current_user.id)
    if not todo:
        raise HTTPException(status_code=404, detail="Todo not found")

    await crud_todo.delete_todo(db, db_todo=todo)
```

## 3. Register API Router

```python
# backend/app/api/api_v1/api.py
from fastapi import APIRouter
from app.api.api_v1.endpoints import auth, todos

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth")
api_router.include_router(todos.router, prefix="/todos")
```

## 4. API Verification

Start the backend server and test the API:

```bash
cd backend
uv run uvicorn app.main:app --reload
```

### User registration

```bash
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123"}'
```

### Login

```bash
curl -X POST http://localhost:8000/api/v1/auth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=test@example.com&password=password123"
```

### Create Todo

```bash
curl -X POST http://localhost:8000/api/v1/todos/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <access_token>" \
  -d '{"title": "Test task", "priority": "high", "tags": "work,important"}'
```

### Get Todo list

```bash
curl "http://localhost:8000/api/v1/todos/?search=test&priority=high&limit=10" \
  -H "Authorization: Bearer <access_token>"
```

## Query Parameter Specifications

| Parameter | Type | Default | Description |
|:---|:---|:---|:---|
| `search` | string | null | Title partial match search |
| `is_completed` | boolean | null | Filter by completion status |
| `priority` | string | null | `high` / `medium` / `low` |
| `tags` | string | null | Tag partial match search |
| `sort_by` | string | `created_at` | `created_at` / `priority` / `due_date` |
| `sort_order` | string | `desc` | `asc` / `desc` |
| `skip` | integer | 0 | Skip count (offset) |
| `limit` | integer | 100 | Max items to retrieve (max 100) |

## Next Steps

Once API endpoints are ready, let's implement logging, error handling, and rate limiting middleware in [Chapter 07: Middleware](07-backend-middleware.md).
