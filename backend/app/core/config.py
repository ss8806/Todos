import os
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "Todo API"
    PROJECT_VERSION: str = "0.1.0"
    PROJECT_DESCRIPTION: str = """
Todo Management API System

このAPIは、TODOアイテムの作成・取得・更新・削除と、
ユーザー認証・管理機能を提供します。

## 機能
- **認証**: JWTベースのユーザー認証
- **TODO管理**: タスクのCRUD操作
- **ユーザー管理**: ユーザー情報の管理

## 認証
Bearerトークンを使用して認証を行います。
ログイン後、受け取ったトークンを`Authorization`ヘッダーに設定してください。
"""
    API_V1_STR: str = "/api/v1"

    # 実行環境
    ENVIRONMENT: str = "development"

    @property
    def is_development(self) -> bool:
        return self.ENVIRONMENT == "development"

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == "production"

    # 環境変数から読み込む、デフォルト値はローカルDBを想定
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "password"
    POSTGRES_SERVER: str = "127.0.0.1"
    POSTGRES_PORT: str = "5432"
    POSTGRES_DB: str = "tododb"

    DATABASE_URL: str | None = None

    @property
    def async_database_url(self) -> str:
        if self.DATABASE_URL:
            return self.DATABASE_URL
        return f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

    # 本番環境では必ず環境変数から設定すること
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # CORS 設定（本番環境では環境変数で厳密に制御）
    BACKEND_CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
    ]

    # Rate Limiting 設定
    RATE_LIMIT_DEFAULT: str = os.getenv("RATE_LIMIT_DEFAULT", "100/minute")
    RATE_LIMIT_LOGIN: str = os.getenv("RATE_LIMIT_LOGIN", "5/minute")
    RATE_LIMIT_REGISTER: str = os.getenv("RATE_LIMIT_REGISTER", "5/minute")
    RATE_LIMIT_FORGOT_PASSWORD: str = os.getenv("RATE_LIMIT_FORGOT_PASSWORD", "3/hour")
    RATE_LIMIT_RESET_PASSWORD: str = os.getenv("RATE_LIMIT_RESET_PASSWORD", "5/minute")

    # メール設定
    SMTP_HOST: str = os.getenv("SMTP_HOST", "localhost")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "1025"))
    SMTP_USER: str | None = os.getenv("SMTP_USER")
    SMTP_PASSWORD: str | None = os.getenv("SMTP_PASSWORD")
    SMTP_TLS: bool = os.getenv("SMTP_TLS", "false").lower() == "true"
    SMTP_SSL: bool = os.getenv("SMTP_SSL", "false").lower() == "true"
    MAIL_FROM: str = os.getenv("MAIL_FROM", "noreply@todoapp.dev")
    MAIL_FROM_NAME: str = os.getenv("MAIL_FROM_NAME", "Todo App")

    # フロントエンドURL（パスワードリセットリンク用）
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:3000")

    # パスワードリセットトークン有効期限（時間）
    RESET_TOKEN_EXPIRE_HOURS: int = int(os.getenv("RESET_TOKEN_EXPIRE_HOURS", "24"))

    model_config = SettingsConfigDict(
        env_file=os.path.join(
            os.path.dirname(
                os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
            ),
            ".env",
        ),
        extra="ignore",
    )


settings = Settings()
