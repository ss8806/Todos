from sqlalchemy.orm import Session
from . import models, schemas, auth
import uuid

# User operations
def get_user_by_username(db: Session, username: str):
    return db.query(models.User).filter(models.User.username == username).first()

def create_user(db: Session, user: schemas.UserCreate):
    hashed_password = auth.get_password_hash(user.password)
    db_user = models.User(
        username=user.username,
        hashed_password=hashed_password
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

# Todo operations
def get_todos(db: Session, user_id: uuid.UUID):
    return db.query(models.Todo).filter(models.Todo.user_id == user_id).all()

def create_todo(db: Session, todo: schemas.TodoCreate, user_id: uuid.UUID):
    db_todo = models.Todo(**todo.model_dump(), user_id=user_id)
    db.add(db_todo)
    db.commit()
    db.refresh(db_todo)
    return db_todo
