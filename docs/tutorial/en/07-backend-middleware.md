# 07. Middleware and Error Handling

This chapter covers implementing request/response logging, unified error handling, and rate limiting integration.

## 1. Structured Logging Setup

```python
# backend/app/core/logging.py
import logging
import sys
from pythonjsonlogger import jsonlogger


def setup_logging():
    """Initialize application-wide logging"""
    log_handler = logging.StreamHandler(sys.stdout)
    formatter = jsonlogger.JsonFormatter(
        "%(asctime)s %(levelname)s %(name)s %(message)s"
    )
    log_handler.setFormatter(formatter)

    root_logger = logging.getLogger()
    root_logger.handlers = []
    root_logger.addHandler(log_handler)
    root_logger.setLevel(logging.INFO)

    # Unify uvicorn logs in JSON format as well
    for logger_name in ["uvicorn", "uvicorn.access", "uvicorn.error"]:
        logger = logging.getLogger(logger_name)
        logger.handlers = []
        logger.addHandler(log_handler)
        logger.setLevel(logging.INFO)
```

## 2. Logging Middleware

```python
# backend/app/middleware/logging.py
import time
import logging
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger("app")


class LoggingMiddleware(BaseHTTPMiddleware):
    """Middleware that logs requests/responses"""

    async def dispatch(self, request: Request, call_next):
        start_time = time.time()

        # Log request information
        logger.info(
            "Request started",
            extra={
                "method": request.method,
                "path": request.url.path,
                "client_ip": request.client.host if request.client else None,
            }
        )

        response = await call_next(request)

        # Calculate processing time
        process_time = time.time() - start_time

        # Log response information
        logger.info(
            "Request completed",
            extra={
                "method": request.method,
                "path": request.url.path,
                "status_code": response.status_code,
                "process_time_ms": round(process_time * 1000, 2),
            }
        )

        # Add processing time to response headers
        response.headers["X-Process-Time"] = str(process_time)

        return response
```

## 3. Error Handling Middleware

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
    """Handler for request validation errors"""
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
            "detail": "Invalid input data",
            "message": "Invalid input data",
            "error_code": "VALIDATION_ERROR",
            "details": errors,
        }
    )


async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    """Handler for HTTP exceptions"""
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
    """Handler for rate limit exceeded"""
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
            "detail": "Too many requests. Please try again later.",
            "message": "Too many requests. Please try again later.",
            "error_code": "RATE_LIMIT_EXCEEDED",
        }
    )


async def general_exception_handler(request: Request, exc: Exception):
    """Handler for unexpected exceptions"""
    logger.exception(
        "Unexpected error",
        extra={"path": request.url.path}
    )

    return JSONResponse(
        status_code=500,
        content={
            "status_code": 500,
            "detail": "An internal server error occurred",
            "message": "An internal server error occurred",
            "error_code": "INTERNAL_SERVER_ERROR",
        }
    )
```

## 4. Email Sending Settings (core/mail.py)

Used for sending password reset emails.

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
        subject="Password Reset Instructions",
        recipients=[email],
        body=f"""
We have received your password reset request.

Please click the link below to set a new password:
{reset_url}

This link is valid for 24 hours.
        """,
        subtype="plain",
    )

    await fast_mail.send_message(message)
```

## 5. Integrate Middleware into main.py

Integrate the components created so far into `main.py`.

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

# Initialize logging
setup_logging()

logger = logging.getLogger("app")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # At application startup
    logger.info("Application startup", extra={"version": settings.PROJECT_VERSION})

    # Development: Auto-generate tables
    if settings.is_development:
        async with engine.begin() as conn:
            await conn.run_sync(SQLModel.metadata.create_all)

    logger.info("Database initialized successfully")
    yield

    # At application shutdown
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
        {"name": "auth", "description": "Authentication-related APIs"},
        {"name": "users", "description": "User management APIs"},
        {"name": "todos", "description": "TODO management APIs"},
        {"name": "health", "description": "Health check APIs"},
    ],
)

# Integrate SlowAPI rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_exception_handler)

# Register error handlers
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(HTTPException, http_exception_handler)
app.add_exception_handler(Exception, general_exception_handler)

# CORS middleware
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

# Logging middleware
app.add_middleware(LoggingMiddleware)

# API routers
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/")
async def read_root():
    return {"message": f"Welcome to {settings.PROJECT_NAME}"}


@app.get("/health", tags=["health"], summary="Health check")
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

## 6. Add OpenAPI Security Schema

Add Bearer authentication definition to `main.py`:

```python
# Add to main.py (after app = FastAPI(...))
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

    # Add Bearer authentication schema
    openapi_schema["components"]["securitySchemes"] = {
        "BearerAuth": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
            "description": "Enter JWT Bearer token"
        }
    }

    app.openapi_schema = openapi_schema
    return app.openapi_schema


app.openapi = custom_openapi
```

## Verification

```bash
cd backend
uv run uvicorn app.main:app --reload
```

- API Documentation: http://localhost:8000/api/v1/openapi.json
- Health Check: http://localhost:8000/health

## Next Steps

Once the backend is ready, let's implement Next.js settings and API client in [Chapter 08: Frontend Foundation](08-frontend-setup.md).
