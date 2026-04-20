from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from . import models, schemas, crud
from .database import engine, get_db

# 開発用: テーブルを自動生成 (Alembic導入前)
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Todo API")

@app.get("/")
def read_root():
    return {"message": "Welcome to Todo API"}

@app.get("/health")
def health_check(db: Session = Depends(get_db)):
    try:
        # DB接続確認
        db.execute(models.Base.metadata.tables["users"].select())
        return {"status": "ok", "database": "connected"}
    except Exception as e:
        return {"status": "error", "database": str(e)}
