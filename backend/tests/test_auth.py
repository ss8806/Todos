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
async def test_register_user(client, setup_db):
    """ユーザー登録のテスト"""
    response = await client.post(
        "/api/v1/auth/register",
        json={"username": "testuser", "password": "testpassword"}
    )
    assert response.status_code == 201
    data = response.json()
    assert data["username"] == "testuser"
    assert "id" in data

@pytest.mark.asyncio
async def test_register_duplicate_user(client, setup_db):
    """重複ユーザー登録のテスト"""
    # 最初のユーザー登録
    await client.post(
        "/api/v1/auth/register",
        json={"username": "duplicateuser", "password": "password123"}
    )
    
    # 同じユーザー名で再度登録
    response = await client.post(
        "/api/v1/auth/register",
        json={"username": "duplicateuser", "password": "password123"}
    )
    assert response.status_code == 400

@pytest.mark.asyncio
async def test_login(client, setup_db):
    """ログインのテスト"""
    # ユーザー登録
    await client.post(
        "/api/v1/auth/register",
        json={"username": "loginuser", "password": "password123"}
    )
    
    # ログイン
    response = await client.post(
        "/api/v1/auth/token",
        data={"username": "loginuser", "password": "password123"},
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"

@pytest.mark.asyncio
async def test_login_invalid_credentials(client, setup_db):
    """無効な認証情報でのログインテスト"""
    response = await client.post(
        "/api/v1/auth/token",
        data={"username": "wronguser", "password": "wrongpassword"},
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    assert response.status_code == 401
