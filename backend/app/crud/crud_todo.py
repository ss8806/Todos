import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from app.models.todo import Todo
from app.schemas.todo import TodoCreate

async def get_todos(db: AsyncSession, user_id: uuid.UUID):
    statement = select(Todo).where(Todo.user_id == user_id)
    result = await db.execute(statement)
    return result.scalars().all()

async def create_todo(db: AsyncSession, todo: TodoCreate, user_id: uuid.UUID):
    db_todo = Todo.model_validate(todo, update={"user_id": user_id})
    db.add(db_todo)
    await db.commit()
    await db.refresh(db_todo)
    return db_todo

async def update_todo(db: AsyncSession, todo_id: uuid.UUID, is_completed: bool, user_id: uuid.UUID):
    statement = select(Todo).where(Todo.id == todo_id, Todo.user_id == user_id)
    result = await db.execute(statement)
    db_todo = result.scalar_one_or_none()
    if db_todo:
        db_todo.is_completed = is_completed
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
