# 06. Todo CRUD API の実装

この章では、Todoアイテムの作成・取得・更新・削除（CRUD）APIを実装します。検索・フィルタリング・ソート・ページネーション機能も合わせて実装します。

## 1. Todo CRUD 操作

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
    """Todo一覧を取得（検索・フィルタ・ソート・ページネーション対応）"""
    query = select(Todo).where(Todo.user_id == user_id)

    # 検索（タイトル部分一致）
    if search:
        query = query.where(Todo.title.ilike(f"%{search}%"))

    # 完了状態フィルタ
    if is_completed is not None:
        query = query.where(Todo.is_completed == is_completed)

    # 優先度フィルタ
    if priority:
        query = query.where(Todo.priority == priority)

    # タグフィルタ（部分一致）
    if tags:
        query = query.where(Todo.tags.ilike(f"%{tags}%"))

    # ソート
    sort_column = getattr(Todo, sort_by, Todo.created_at)
    if sort_order == "desc":
        query = query.order_by(sort_column.desc())
    else:
        query = query.order_by(sort_column.asc())

    # ページネーション
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
    """フィルタ条件に一致するTodoの件数を取得"""
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
    """特定のTodoを取得"""
    result = await db.execute(
        select(Todo).where(Todo.id == todo_id, Todo.user_id == user_id)
    )
    return result.scalar_one_or_none()


async def create_todo(db: AsyncSession, user_id, todo: TodoCreate) -> Todo:
    """新規Todoを作成"""
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
    """Todoを更新（部分更新対応）"""
    update_data = todo_update.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(db_todo, field, value)

    db.add(db_todo)
    await db.commit()
    await db.refresh(db_todo)
    return db_todo


async def delete_todo(db: AsyncSession, db_todo: Todo) -> None:
    """Todoを削除"""
    await db.delete(db_todo)
    await db.commit()
```

ポイント：
- `ilike` で大文字小文字を区別しない部分一致検索
- `exclude_unset=True` でリクエストに含まれたフィールドのみ更新（部分更新）
- `func.count` で件数取得を効率的に行う

## 2. Todo API エンドポイント

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


@router.get("/", response_model=list[TodoRead], summary="Todo一覧取得")
@limiter.limit(settings.RATE_LIMIT_DEFAULT)
async def read_todos(
    request,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
    search: Optional[str] = Query(None, description="タイトル部分一致検索"),
    is_completed: Optional[bool] = Query(None, description="完了状態フィルタ"),
    priority: Optional[str] = Query(None, description="優先度フィルタ (high/medium/low)"),
    tags: Optional[str] = Query(None, description="タグフィルタ"),
    sort_by: str = Query("created_at", description="ソート項目"),
    sort_order: str = Query("desc", description="ソート順 (asc/desc)"),
    skip: int = Query(0, ge=0, description="スキップ件数"),
    limit: int = Query(100, ge=1, le=100, description="取得件数上限"),
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


@router.get("/count", summary="Todo件数取得")
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


@router.post("/", response_model=TodoRead, status_code=status.HTTP_201_CREATED, summary="Todo作成")
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


@router.put("/{todo_id}", response_model=TodoRead, summary="Todo更新")
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
        raise HTTPException(status_code=404, detail="Todoが見つかりません")

    todo = await crud_todo.update_todo(db, db_todo=todo, todo_update=todo_in)
    return todo


@router.delete("/{todo_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Todo削除")
@limiter.limit(settings.RATE_LIMIT_DEFAULT)
async def delete_todo(
    request,
    todo_id,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> None:
    todo = await crud_todo.get_todo(db, todo_id=todo_id, user_id=current_user.id)
    if not todo:
        raise HTTPException(status_code=404, detail="Todoが見つかりません")

    await crud_todo.delete_todo(db, db_todo=todo)
```

## 3. APIルーターへの登録

```python
# backend/app/api/api_v1/api.py
from fastapi import APIRouter
from app.api.api_v1.endpoints import auth, todos

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth")
api_router.include_router(todos.router, prefix="/todos")
```

## 4. API の動作確認

バックエンドサーバーを起動して、APIをテストします：

```bash
cd backend
uv run uvicorn app.main:app --reload
```

### ユーザー登録

```bash
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123"}'
```

### ログイン

```bash
curl -X POST http://localhost:8000/api/v1/auth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=test@example.com&password=password123"
```

### Todo作成

```bash
curl -X POST http://localhost:8000/api/v1/todos/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <access_token>" \
  -d '{"title": "テストタスク", "priority": "high", "tags": "仕事,重要"}'
```

### Todo一覧取得

```bash
curl "http://localhost:8000/api/v1/todos/?search=テスト&priority=high&limit=10" \
  -H "Authorization: Bearer <access_token>"
```

## クエリパラメータの仕様

| パラメータ | 型 | デフォルト | 説明 |
|:---|:---|:---|:---|
| `search` | string | null | タイトルの部分一致検索 |
| `is_completed` | boolean | null | 完了状態でフィルタ |
| `priority` | string | null | `high` / `medium` / `low` |
| `tags` | string | null | タグの部分一致検索 |
| `sort_by` | string | `created_at` | `created_at` / `priority` / `due_date` |
| `sort_order` | string | `desc` | `asc` / `desc` |
| `skip` | integer | 0 | スキップ件数（オフセット） |
| `limit` | integer | 100 | 取得件数上限（最大100） |

## 次のステップ

APIエンドポイントが整ったら、[07章: ミドルウェア](07-backend-middleware.md) でロギング、エラーハンドリング、レート制限のミドルウェアを実装します。
