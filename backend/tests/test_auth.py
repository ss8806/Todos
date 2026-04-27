import pytest
from tests.factories import UserCreateFactory


@pytest.mark.asyncio
async def test_register_user(client, setup_db):
    """ユーザー登録のテスト"""
    user_data = UserCreateFactory.build()
    response = await client.post(
        "/api/v1/auth/register",
        json={"email": user_data.email, "password": user_data.password}
    )
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == user_data.email
    assert "id" in data

@pytest.mark.asyncio
async def test_register_duplicate_user(client, setup_db):
    """重複ユーザー登録のテスト"""
    # Factoryで同じメールを使い回す
    user_data = UserCreateFactory.build(email="duplicate@example.com")
    # 最初のユーザー登録
    await client.post(
        "/api/v1/auth/register",
        json={"email": user_data.email, "password": user_data.password}
    )

    # 同じメールアドレスで再度登録
    response = await client.post(
        "/api/v1/auth/register",
        json={"email": user_data.email, "password": user_data.password}
    )
    assert response.status_code == 400

@pytest.mark.asyncio
async def test_login(client, setup_db):
    """ログインのテスト"""
    # Factoryでユーザーデータ生成 → API登録
    user_data = UserCreateFactory.build(email="login@example.com")
    await client.post(
        "/api/v1/auth/register",
        json={"email": user_data.email, "password": user_data.password}
    )

    # ログイン（OAuth2PasswordRequestForm は username フィールドを使用）
    response = await client.post(
        "/api/v1/auth/token",
        data={"username": user_data.email, "password": user_data.password},
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
