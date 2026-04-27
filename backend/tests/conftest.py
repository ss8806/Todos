import os

# テスト実行時にレートリミットを緩和
os.environ["RATE_LIMIT_DEFAULT"] = "10000/minute"
os.environ["RATE_LIMIT_LOGIN"] = "10000/minute"
os.environ["RATE_LIMIT_REGISTER"] = "10000/minute"

import asyncio
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy import create_engine, text
from app.main import app
from app.core.db import engine
from app.core.config import settings
from sqlmodel import SQLModel


def _sync_reset_database():
    """同期的にデータベースを完全にリセット（greenlet問題を回避）"""
    sync_url = settings.async_database_url.replace("postgresql+asyncpg://", "postgresql://")
    sync_engine = create_engine(sync_url)
    with sync_engine.begin() as conn:
        conn.execute(text("""
            DO $$ DECLARE
                r RECORD;
            BEGIN
                FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
                    EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
                END LOOP;
                FOR r IN (SELECT typname FROM pg_type WHERE typtype = 'e' AND typnamespace = 'public'::regnamespace) LOOP
                    EXECUTE 'DROP TYPE IF EXISTS ' || quote_ident(r.typname) || ' CASCADE';
                END LOOP;
            END $$;
        """))
    SQLModel.metadata.create_all(sync_engine)
    sync_engine.dispose()


@pytest_asyncio.fixture(loop_scope="function")
async def setup_db():
    """テスト用のデータベースセットアップ"""
    await asyncio.to_thread(_sync_reset_database)
    yield
    await engine.dispose()


@pytest_asyncio.fixture(loop_scope="function")
async def client():
    """テスト用クライアント"""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c
