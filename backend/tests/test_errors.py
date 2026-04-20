import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.db import engine
from sqlmodel import SQLModel

@pytest.fixture
async def setup_db():
    """テスト用のデータベースセットアップ"""
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.drop_all)

@pytest.fixture
async def client():
    """テスト用クライアント"""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c

@pytest.mark.asyncio
async def test_health_check(client, setup_db):
    """ヘルスチェックエンドポイントのテスト"""
    response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "database" in data["components"]

@pytest.mark.asyncio
async def test_root_endpoint(client, setup_db):
    """ルートエンドポイントのテスト"""
    response = await client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "message" in data

@pytest.mark.asyncio
async def test_validation_error(client, setup_db):
    """バリデーションエラーのテスト"""
    # 空のタイトルでTodo作成
    response = await client.post(
        "/api/v1/todos/",
        json={},
        headers={"Authorization": "Bearer fake-token"}
    )
    # バリデーションエラーまたは認証エラー
    assert response.status_code in [401, 422]

@pytest.mark.asyncio
async def test_not_found(client, setup_db):
    """404エラーのテスト"""
    response = await client.get("/api/v1/nonexistent")
    assert response.status_code == 404
