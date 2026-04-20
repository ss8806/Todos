from typing import Optional, Any
from pydantic import BaseModel


class ErrorResponse(BaseModel):
    """
    統一エラーレスポンススキーマ
    """
    status_code: int
    detail: str
    message: Optional[str] = None
    error_code: Optional[str] = None
    details: Optional[list[dict[str, Any]]] = None


class ValidationErrorDetail(BaseModel):
    """
    バリデーションエラー詳細
    """
    field: str
    message: str
    value: Optional[Any] = None
