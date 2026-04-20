from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.models import OAuthFlows as OAuthFlowsModel
from fastapi.openapi.models import SecurityScheme
from contextlib import asynccontextmanager
from scalar_fastapi import get_scalar_api_reference
from sqlmodel import SQLModel, text
from sqlalchemy.ext.asyncio import AsyncSession
import logging

from app.api.api_v1.api import api_router
from app.core.config import settings
from app.core.db import engine, get_db
from app.core.logging import setup_logging
from app.middleware.logging import LoggingMiddleware
from app.middleware.error_handler import (
    validation_exception_handler,
    http_exception_handler,
    general_exception_handler
)
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from fastapi import HTTPException
from slowapi.errors import RateLimitExceeded
from app.core.limiter import limiter
from app.middleware.error_handler import rate_limit_exception_handler

# ロギングの初期化
setup_logging()

logger = logging.getLogger("app")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # アプリケーション起動時の処理
    logger.info("Application startup", extra={"version": settings.PROJECT_VERSION})
    
    # 開発用: テーブルを自動生成
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
    
    logger.info("Database initialized successfully")
    
    yield
    
    # アプリケーションシャットダウン時の処理
    logger.info("Application shutdown")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.PROJECT_VERSION,
    description=settings.PROJECT_DESCRIPTION,
    docs_url=None,
    redoc_url=None,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan,
    # OpenAPIセキュリティスキーマ
    openapi_tags=[
        {"name": "auth", "description": "認証関連のAPI"},
        {"name": "users", "description": "ユーザー管理API"},
        {"name": "todos", "description": "TODO管理API"},
        {"name": "health", "description": "ヘルスチェックAPI"},
    ],
)

# エラーハンドラーの登録
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(HTTPException, http_exception_handler)
app.add_exception_handler(Exception, general_exception_handler)
app.add_exception_handler(RateLimitExceeded, rate_limit_exception_handler)

# JWT Bearer認証スキーマを追加
app.openapi_schema = None

def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    
    from fastapi.openapi.utils import get_openapi
    
    openapi_schema = get_openapi(
        title=app.title,
        version=app.version,
        description=app.description,
        routes=app.routes,
    )
    
    # セキュリティスキーマの追加
    openapi_schema["components"]["securitySchemes"] = {
        "BearerAuth": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
            "description": "JWT Bearerトークンを入力してください"
        }
    }
    
    app.openapi_schema = openapi_schema
    return app.openapi_schema

app.openapi = custom_openapi

# CORS ミドルウェアの設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ロギングミドルウェアの追加
app.add_middleware(LoggingMiddleware)

# Scalar API Reference
@app.get("/docs", include_in_schema=False)
async def scalar_html():
    return get_scalar_api_reference(
        openapi_url=app.openapi_url,
        title=app.title,
    )

app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/")
async def read_root():
    return {"message": f"Welcome to {settings.PROJECT_NAME}"}

@app.get("/health", tags=["health"], summary="ヘルスチェック", response_description="ヘルスステータス")
async def health_check(db: AsyncSession = Depends(get_db)):
    """
    ヘルスチェックエンドポイント
    データベース接続を含むシステムの健全性を確認
    """
    health_status = {
        "status": "ok",
        "version": settings.PROJECT_VERSION,
        "components": {}
    }
    
    # データベース接続チェック
    try:
        await db.execute(text("SELECT 1"))
        health_status["components"]["database"] = {
            "status": "ok",
            "message": "Database connection established"
        }
    except Exception as e:
        health_status["status"] = "error"
        health_status["components"]["database"] = {
            "status": "error",
            "message": str(e)
        }
        logger.error("Database health check failed", extra={"error": str(e)})
    
    # ヘルスチェック結果をログに記録
    logger.info(
        "Health check performed",
        extra={"overall_status": health_status["status"]}
    )
    
    return health_status
