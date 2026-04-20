import logging
import sys
from pythonjsonlogger import jsonlogger


def setup_logging(log_level: str = "INFO") -> None:
    """
    構造化ログの設定を行う
    
    Args:
        log_level: ログレベル (DEBUG, INFO, WARNING, ERROR, CRITICAL)
    """
    logger = logging.getLogger()
    
    # 既存のハンドラをクリア
    logger.handlers.clear()
    
    # コンソールハンドラの設定
    handler = logging.StreamHandler(sys.stdout)
    
    # 構造化ログフォーマッターの設定
    formatter = jsonlogger.JsonFormatter(
        fmt="%(asctime)s %(name)s %(levelname)s %(message)s %(filename)s %(funcName)s %(lineno)d",
        datefmt="%Y-%m-%dT%H:%M:%S",
    )
    
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    logger.setLevel(getattr(logging, log_level.upper(), logging.INFO))
    
    # アプリケーションロガーの設定
    app_logger = logging.getLogger("app")
    app_logger.setLevel(getattr(logging, log_level.upper(), logging.INFO))
    
    app_logger.info("Logging system initialized", extra={"log_level": log_level})
