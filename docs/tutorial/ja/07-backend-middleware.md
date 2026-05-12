# 07. ミドルウェアとエラーハンドリング

この章では、リクエスト/レスポンスのロギング、統一されたエラーハンドリング、レート制限の統合を実装します。

## 1. 構造化ロギングの設定

```python
# backend/app/core/logging.py
import logging
import sys
from pythonjsonlogger import jsonlogger


def setup_logging():
    """アプリケーション全体のロギングを初期化"""
    log_handler = logging.StreamHandler(sys.stdout)
    formatter = jsonlogger.JsonFormatter(
        "%(asctime)s %(levelname)s %(name)s %(message)s"
    )
    log_handler.setFormatter(formatter)

    root_logger = logging.getLogger()
    root_logger.handlers = []
    root_logger.addHandler(log_handler)
    root_logger.setLevel(logging.INFO)

    # uvicornのログもJSON形式に統一
    for logger_name in ["uvicorn", "uvicorn.access", "uvicorn.error"]:
        logger = logging.getLogger(logger_name)
        logger.handlers = []
        logger.addHandler(log_handler)
        logger.setLevel(logging.INFO)
```

## 2. ロギングミドルウェア

```python
# backend/app/middleware/logging.py
import time
import logging
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger("app")


class LoggingMiddleware(BaseHTTPMiddleware):
    """リクエスト/レスポンスをログに記録するミドルウェア"""

    async def dispatch(self, request: Request, call_next):
        start_time = time.time()

        # リクエスト情報をログに記録
        logger.info(
            "Request started",
            extra={
                "method": request.method,
                "path": request.url.path,
                "client_ip": request.client.host if request.client else None,
            }
        )

        response = await call_next(request)

        # 処理時間を計算
        process_time = time.time() - start_time

        # レスポンス情報をログに記録
        logger.info(
            "Request completed",
            extra={
                "method": request.method,
                "path": request.url.path,
                "status_code": response.status_code,
                "process_time_ms": round(process_time * 1000, 2),
            }
        )

        # レスポンスヘッダーに処理時間を追加
        response.headers["X-Process-Time"] = str(process_time)

        return response
```

## 3. エラーハンドリングミドルウェア

```python
# backend/app/middleware/error_handler.py
import logging
from fastapi import Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from slowapi.errors import RateLimitExceeded

logger = logging.getLogger("app")


async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """リクエストバリデーションエラーのハンドラー"""
    errors = []
    for error in exc.errors():
        errors.append({
            "field": ".".join(str(x) for x in error["loc"]),
            "message": error["msg"],
            "value": error.get("input"),
        })

    logger.warning(
        "Validation error",
        extra={
            "path": request.url.path,
            "errors": errors,
        }
    )

    return JSONResponse(
        status_code=422,
        content={
            "status_code": 422,
            "detail": "入力データが無効です",
            "message": "入力データが無効です",
            "error_code": "VALIDATION_ERROR",
            "details": errors,
        }
    )


async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    """HTTP例外のハンドラー"""
    logger.warning(
        "HTTP exception",
        extra={
            "path": request.url.path,
            "status_code": exc.status_code,
            "detail": exc.detail,
        }
    )

    return JSONResponse(
        status_code=exc.status_code,
        content={
            "status_code": exc.status_code,
            "detail": exc.detail,
            "message": exc.detail,
            "error_code": f"HTTP_{exc.status_code}",
        }
    )


async def rate_limit_exception_handler(request: Request, exc: RateLimitExceeded):
    """レート制限超過のハンドラー"""
    logger.warning(
        "Rate limit exceeded",
        extra={
            "path": request.url.path,
            "client_ip": request.client.host if request.client else None,
        }
    )

    return JSONResponse(
        status_code=429,
        content={
            "status_code": 429,
            "detail": "リクエストが多すぎます。しばらく経ってからお試しください。",
            "message": "リクエストが多すぎます。しばらく経ってからお試しください。",
            "error_code": "RATE_LIMIT_EXCEEDED",
        }
    )


async def general_exception_handler(request: Request, exc: Exception):
    """予期しない例外のハンドラー"""
    logger.exception(
        "Unexpected error",
        extra={"path": request.url.path}
    )

    return JSONResponse(
        status_code=500,
        content={
            "status_code": 500,
            "detail": "サーバー内部エラーが発生しました",
            "message": "サーバー内部エラーが発生しました",
            "error_code": "INTERNAL_SERVER_ERROR",
        }
    )
```

## 4. メール送信設定（core/mail.py）

パスワードリセットメールの送信に使用します。

```python
# backend/app/core/mail.py
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig
from app.core.config import settings

conf = ConnectionConfig(
    MAIL_USERNAME=settings.SMTP_USER or "",
    MAIL_PASSWORD=settings.SMTP_PASSWORD or "",
    MAIL_FROM=settings.MAIL_FROM,
    MAIL_PORT=settings.SMTP_PORT,
    MAIL_SERVER=settings.SMTP_HOST,
    MAIL_STARTTLS=settings.SMTP_TLS,
    MAIL_SSL_TLS=settings.SMTP_SSL,
    USE_CREDENTIALS=bool(settings.SMTP_USER),
    TEMPLATE_FOLDER="./app/templates/email",
)

fast_mail = FastMail(conf)


async def send_reset_password_email(email: str, token: str) -> None:
    reset_url = f"{settings.FRONTEND_URL}/reset-password?token={token}"

    message = MessageSchema(
        subject="パスワードリセットのご案内",
        recipients=[email],
        body=f"""
パスワードリセットのリクエストを受け付けました。

以下のリンクをクリックして、新しいパスワードを設定してください：
{reset_url}

このリンクは24時間有効です。
        """,
        subtype="plain",
    )

    await fast_mail.send_message(message)
```

## 5. main.py にミドルウェアを統合

これまで作成したコンポーネントを `main.py` に統合します。

```python
# backend/app/main.py
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from sqlmodel import SQLModel, text
from sqlalchemy.ext.asyncio import AsyncSession
import logging

from app.api.api_v1.api import api_router
from app.core.config import settings
from app.core.db import engine, get_db
from app.core.logging import setup_logging
from app.core.limiter import limiter
from app.middleware.logging import LoggingMiddleware
from app.middleware.error_handler import (
    validation_exception_handler,
    http_exception_handler,
    general_exception_handler,
    rate_limit_exception_handler,
)
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from fastapi import HTTPException
from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler

# ロギングの初期化
setup_logging()

logger = logging.getLogger("app")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # アプリケーション起動時
    logger.info("Application startup", extra={"version": settings.PROJECT_VERSION})

    # 開発用: テーブルを自動生成
    if settings.is_development:
        async with engine.begin() as conn:
            await conn.run_sync(SQLModel.metadata.create_all)

    logger.info("Database initialized successfully")
    yield

    # アプリケーションシャットダウン時
    logger.info("Application shutdown")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.PROJECT_VERSION,
    description=settings.PROJECT_DESCRIPTION,
    docs_url=None,
    redoc_url=None,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan,
    openapi_tags=[
        {"name": "auth", "description": "認証関連のAPI"},
        {"name": "users", "description": "ユーザー管理API"},
        {"name": "todos", "description": "TODO管理API"},
        {"name": "health", "description": "ヘルスチェックAPI"},
    ],
)

# SlowAPIのレート制限を統合
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_exception_handler)

# エラーハンドラーの登録
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(HTTPException, http_exception_handler)
app.add_exception_handler(Exception, general_exception_handler)

# CORSミドルウェア
if settings.is_production and not settings.BACKEND_CORS_ORIGINS:
    raise RuntimeError("BACKEND_CORS_ORIGINS must be set in production environment")

if settings.is_production:
    allow_methods = ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"]
    allow_headers = ["Authorization", "Content-Type", "X-Requested-With"]
else:
    allow_methods = ["*"]
    allow_headers = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
    allow_credentials=True,
    allow_methods=allow_methods,
    allow_headers=allow_headers,
)

# ロギングミドルウェア
app.add_middleware(LoggingMiddleware)

# APIルーター
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/")
async def read_root():
    return {"message": f"Welcome to {settings.PROJECT_NAME}"}


@app.get("/health", tags=["health"], summary="ヘルスチェック")
async def health_check(db: AsyncSession = Depends(get_db)):
    health_status = {
        "status": "ok",
        "version": settings.PROJECT_VERSION,
        "components": {}
    }

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

    logger.info("Health check performed", extra={"overall_status": health_status["status"]})
    return health_status
```

## 6. OpenAPIセキュリティスキーマの追加

`main.py` に Bearer 認証の定義を追加します：

```python
# main.py に追加（app = FastAPI(...) の後）
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

    # Bearer認証スキーマを追加
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
```

## 動作確認

```bash
cd backend
uv run uvicorn app.main:app --reload
```

- APIドキュメント: http://localhost:8000/api/v1/openapi.json
- ヘルスチェック: http://localhost:8000/health

## 次のステップ

バックエンドが整ったら、[08章: フロントエンド基盤](08-frontend-setup.md) で Next.js の設定とAPIクライアントを実装します。
