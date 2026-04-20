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

    SECRET_KEY: str = "your-secret-key-change-me-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # CORS 設定
    BACKEND_CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
    ]

    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), ".env"),
        extra="ignore"
    )

settings = Settings()
