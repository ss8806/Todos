import logging
from typing import Callable
from fastapi import Request, Response
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from slowapi.errors import RateLimitExceeded

from app.schemas.error import ErrorResponse, ValidationErrorDetail

logger = logging.getLogger("app")


async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """
    バリデーションエラーのハンドラー
    Pydantic バリデーションエラーを整形して返す
    """
    errors = []
    for error in exc.errors():
        error_detail = ValidationErrorDetail(
            field=".".join(str(loc) for loc in error["loc"]),
            message=error["msg"],
            value=error.get("input")
        )
        errors.append(error_detail.model_dump())
    
    error_response = ErrorResponse(
        status_code=422,
        detail="Validation error",
        message="リクエストデータが不正です",
        error_code="VALIDATION_ERROR",
        details=errors
    )
    
    logger.warning(
        "Validation error occurred",
        extra={
            "url": str(request.url),
            "method": request.method,
            "errors": errors
        }
    )
    
    return JSONResponse(
        status_code=422,
        content=error_response.model_dump()
    )


async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    """
    HTTP例外のハンドラー
    統一エラーレスポンス形式で返す
    """
    error_response = ErrorResponse(
        status_code=exc.status_code,
        detail=exc.detail,
        message=get_error_message(exc.status_code)
    )
    
    logger.warning(
        "HTTP error occurred",
        extra={
            "url": str(request.url),
            "method": request.method,
            "status_code": exc.status_code,
            "detail": exc.detail
        }
    )
    
    return JSONResponse(
        status_code=exc.status_code,
        content=error_response.model_dump()
    )


async def general_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    一般例外のハンドラー
    予期せぬエラーをキャッチして統一形式で返す
    """
    logger.error(
        "Unexpected error occurred",
        extra={
            "url": str(request.url),
            "method": request.method,
            "error": str(exc)
        },
        exc_info=True
    )
    
    error_response = ErrorResponse(
        status_code=500,
        detail="Internal server error",
        message="予期せぬエラーが発生しました",
        error_code="INTERNAL_ERROR"
    )
    
    return JSONResponse(
        status_code=500,
        content=error_response.model_dump()
    )


def get_error_message(status_code: int) -> str:
    """
    ステータスコードに応じた日本語エラーメッセージを返す
    """
    messages = {
        400: "リクエストが不正です",
        401: "認証が必要です、再度ログインしてください",
        403: "この操作の権限がありません",
        404: "お探しのリソースが見つかりません",
        409: "リソースの競合が発生しました",
        422: "リクエストデータが不正です",
        429: "リクエスト制限超过了。しばらく待ってから再度お試しください",
        500: "サーバー内部エラーが発生しました",
        503: "サービスが利用できません"
    }
    return messages.get(status_code, "エラーが発生しました")


async def rate_limit_exception_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    """
    Rate Limit エラーのハンドラー
    """
    error_response = ErrorResponse(
        status_code=429,
        detail="Rate limit exceeded",
        message="リクエスト制限超过了。しばらく待ってから再度お試しください",
        error_code="RATE_LIMIT_EXCEEDED"
    )
    
    logger.warning(
        "Rate limit exceeded",
        extra={
            "url": str(request.url),
            "method": request.method,
            "client_host": request.client.host if request.client else None
        }
    )
    
    return JSONResponse(
        status_code=429,
        content=error_response.model_dump()
    )
