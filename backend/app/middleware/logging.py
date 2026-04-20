import logging
import time
from typing import Callable
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger("app")


class LoggingMiddleware(BaseHTTPMiddleware):
    """
    HTTPリクエスト・レスポンスのログを記録するミドルウェア
    """
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # リクエスト開始時刻
        start_time = time.time()
        
        # リクエスト情報をログに記録
        logger.info(
            "Request started",
            extra={
                "method": request.method,
                "url": str(request.url),
                "client_host": request.client.host if request.client else None,
            }
        )
        
        # リクエストを処理
        try:
            response = await call_next(request)
            
            # 処理時間を計算
            process_time = time.time() - start_time
            
            # レスポンス情報をログに記録
            logger.info(
                "Request completed",
                extra={
                    "method": request.method,
                    "url": str(request.url),
                    "status_code": response.status_code,
                    "process_time": round(process_time, 4),
                }
            )
            
            # レスポンスヘッダーに処理時間を追加
            response.headers["X-Process-Time"] = str(round(process_time, 4))
            
            return response
            
        except Exception as e:
            # エラー発生時のログ
            process_time = time.time() - start_time
            
            logger.error(
                "Request failed",
                extra={
                    "method": request.method,
                    "url": str(request.url),
                    "error": str(e),
                    "process_time": round(process_time, 4),
                },
                exc_info=True
            )
            raise
