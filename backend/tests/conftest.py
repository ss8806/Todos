import os

# テスト実行時にレートリミットを緩和
os.environ["RATE_LIMIT_DEFAULT"] = "10000/minute"
os.environ["RATE_LIMIT_LOGIN"] = "10000/minute"
os.environ["RATE_LIMIT_REGISTER"] = "10000/minute"
os.environ["RATE_LIMIT_FORGOT_PASSWORD"] = "10000/minute"
os.environ["RATE_LIMIT_RESET_PASSWORD"] = "10000/minute"

import asyncio
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy import create_engine, text
from app.main import app
from app.core.db import engine, async_session
from app.core.config import settings
from app.core.security import create_access_token
from sqlmodel import SQLModel


def _sync_reset_database():
    """同期的にデータベースを完全にリセット（greenlet問題を回避）"""
    sync_url = settings.async_database_url.replace(
        "postgresql+asyncpg://", "postgresql://"
    )
    sync_engine = create_engine(sync_url)
    with sync_engine.begin() as conn:
        conn.execute(
            text("""
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
        """)
        )
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


@pytest_asyncio.fixture(loop_scope="function")
async def db_session(setup_db):
    """テスト用の非同期DBセッション"""
    async with async_session() as session:
        yield session


@pytest_asyncio.fixture(loop_scope="function")
async def test_user(db_session):
    """Factoryで作成したテストユーザー（DB直書き）"""
    from app.crud import crud_user
    from tests.factories import UserCreateFactory

    user_data = UserCreateFactory.build()
    user = await crud_user.create_user(db_session, user_data)
    return user


@pytest_asyncio.fixture(loop_scope="function")
async def auth_token(test_user):
    """Factory作成ユーザーのJWTトークン（API経由のログインを回避）"""
    access_token = create_access_token(data={"sub": str(test_user.id)})
    return access_token
