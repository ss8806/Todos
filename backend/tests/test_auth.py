import pytest
from tests.factories import UserCreateFactory


@pytest.mark.asyncio
async def test_register_user(client, setup_db):
    """ユーザー登録のテスト"""
    user_data = UserCreateFactory.build()
    response = await client.post(
        "/api/v1/auth/register",
        json={"email": user_data.email, "password": user_data.password},
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
        json={"email": user_data.email, "password": user_data.password},
    )

    # 同じメールアドレスで再度登録
    response = await client.post(
        "/api/v1/auth/register",
        json={"email": user_data.email, "password": user_data.password},
    )
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_login(client, setup_db):
    """ログインのテスト"""
    # Factoryでユーザーデータ生成 → API登録
    user_data = UserCreateFactory.build(email="login@example.com")
    await client.post(
        "/api/v1/auth/register",
        json={"email": user_data.email, "password": user_data.password},
    )

    # ログイン（OAuth2PasswordRequestForm は username フィールドを使用）
    response = await client.post(
        "/api/v1/auth/token",
        data={"username": user_data.email, "password": user_data.password},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
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
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_protected_endpoint_no_token(client, setup_db):
    """トークンなしで保護エンドポイントにアクセス"""
    response = await client.get("/api/v1/todos/")
    assert response.status_code == 401
    data = response.json()
    assert "detail" in data


@pytest.mark.asyncio
async def test_protected_endpoint_invalid_token(client, setup_db):
    """無効なトークンで保護エンドポイントにアクセス"""
    response = await client.get(
        "/api/v1/todos/", headers={"Authorization": "Bearer invalid-token"}
    )
    assert response.status_code == 401
    data = response.json()
    assert "認証" in data["detail"] or "credentials" in data["detail"].lower()


@pytest.mark.asyncio
async def test_protected_endpoint_expired_token(client, setup_db):
    """期限切れトークンで保護エンドポイントにアクセス"""
    from datetime import timedelta
    from app.core.security import create_access_token
    import uuid

    expired_token = create_access_token(
        data={"sub": str(uuid.uuid4())}, expires_delta=timedelta(minutes=-1)
    )
    response = await client.get(
        "/api/v1/todos/", headers={"Authorization": f"Bearer {expired_token}"}
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_get_current_user_missing_sub(client, setup_db):
    """sub claimのないトークンでアクセス"""
    from app.core.security import create_access_token

    token = create_access_token(data={"other": "value"})
    response = await client.get(
        "/api/v1/todos/", headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 401
    data = response.json()
    assert "無効" in data["detail"] or "認証" in data["detail"]


@pytest.mark.asyncio
async def test_get_current_user_invalid_uuid(client, setup_db):
    """UUIDでないsubを持つトークンでアクセス"""
    from app.core.security import create_access_token

    token = create_access_token(data={"sub": "not-a-uuid"})
    response = await client.get(
        "/api/v1/todos/", headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_get_current_user_deleted_user(client, setup_db):
    """削除されたユーザーのトークンでアクセス"""
    from app.core.security import create_access_token
    import uuid

    # 存在しないUUIDでトークンを作成
    fake_token = create_access_token(data={"sub": str(uuid.uuid4())})
    response = await client.get(
        "/api/v1/todos/", headers={"Authorization": f"Bearer {fake_token}"}
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_get_me_endpoint(client, auth_token):
    """/users/me エンドポイントのテスト"""
    response = await client.get(
        "/api/v1/users/me", headers={"Authorization": f"Bearer {auth_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "email" in data
    assert "id" in data
