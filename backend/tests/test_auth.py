import pytest


@pytest.mark.asyncio
async def test_register_user(client, setup_db):
    """ユーザー登録のテスト"""
    response = await client.post(
        "/api/v1/auth/register",
        json={"email": "test@example.com", "password": "testpassword"}
    )
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "test@example.com"
    assert "id" in data

@pytest.mark.asyncio
async def test_register_duplicate_user(client, setup_db):
    """重複ユーザー登録のテスト"""
    # 最初のユーザー登録
    await client.post(
        "/api/v1/auth/register",
        json={"email": "duplicate@example.com", "password": "password123"}
    )
    
    # 同じメールアドレスで再度登録
    response = await client.post(
        "/api/v1/auth/register",
        json={"email": "duplicate@example.com", "password": "password123"}
    )
    assert response.status_code == 400

@pytest.mark.asyncio
async def test_login(client, setup_db):
    """ログインのテスト"""
    # ユーザー登録
    await client.post(
        "/api/v1/auth/register",
        json={"email": "login@example.com", "password": "password123"}
    )
    
    # ログイン（OAuth2PasswordRequestForm は username フィールドを使用）
    response = await client.post(
        "/api/v1/auth/token",
        data={"username": "login@example.com", "password": "password123"},
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
        data={"username": "wrong@example.com", "password": "wrongpassword"},
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    assert response.status_code == 401
