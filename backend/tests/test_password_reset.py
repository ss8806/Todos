import pytest
from unittest.mock import patch
from app.core.db import get_db
from app.crud import crud_password_reset, crud_user


@pytest.mark.asyncio
async def test_forgot_password_existing_user(client, setup_db):
    """存在するユーザーへのパスワードリセットメール送信テスト"""
    # ユーザー登録
    await client.post(
        "/api/v1/auth/register",
        json={"email": "reset@example.com", "password": "oldpassword123"},
    )

    # メール送信をモック
    with patch("app.api.api_v1.endpoints.auth.send_reset_password_email") as mock_send:
        mock_send.return_value = None
        # パスワードリセットリクエスト
        response = await client.post(
            "/api/v1/auth/forgot-password", json={"email": "reset@example.com"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "メールを送信しました" in data["message"]
        mock_send.assert_called_once()


@pytest.mark.asyncio
async def test_forgot_password_nonexistent_user(client, setup_db):
    """存在しないユーザーへのパスワードリセットリクエストでも200を返す"""
    response = await client.post(
        "/api/v1/auth/forgot-password", json={"email": "nonexistent@example.com"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "メールを送信しました" in data["message"]


@pytest.mark.asyncio
async def test_reset_password_success(client, setup_db):
    """パスワードリセット成功テスト"""
    # ユーザー登録
    await client.post(
        "/api/v1/auth/register",
        json={"email": "reset2@example.com", "password": "oldpassword123"},
    )

    # パスワードリセットトークンを直接作成
    async for db in get_db():
        user = await crud_user.get_user_by_email(db, email="reset2@example.com")
        assert user is not None
        _, raw_token = await crud_password_reset.create_reset_token(db, user.id)

    # パスワードリセット
    response = await client.post(
        "/api/v1/auth/reset-password",
        json={"token": raw_token, "new_password": "newpassword456"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "正常に変更されました" in data["message"]

    # 新しいパスワードでログインできることを確認
    response = await client.post(
        "/api/v1/auth/token",
        data={"username": "reset2@example.com", "password": "newpassword456"},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert response.status_code == 200
    login_data = response.json()
    assert "access_token" in login_data


@pytest.mark.asyncio
async def test_reset_password_invalid_token(client, setup_db):
    """無効なトークンでのパスワードリセットテスト"""
    response = await client.post(
        "/api/v1/auth/reset-password",
        json={"token": "invalidtoken12345", "new_password": "newpassword456"},
    )
    assert response.status_code == 400
    data = response.json()
    assert "無効または期限切れ" in data["detail"]


@pytest.mark.asyncio
async def test_reset_password_used_token(client, setup_db):
    """使用済みトークンでのパスワードリセットテスト"""
    # ユーザー登録
    await client.post(
        "/api/v1/auth/register",
        json={"email": "reset3@example.com", "password": "oldpassword123"},
    )

    # トークン作成
    async for db in get_db():
        user = await crud_user.get_user_by_email(db, email="reset3@example.com")
        assert user is not None
        token_obj, raw_token = await crud_password_reset.create_reset_token(db, user.id)

        # 一度使用済みにする
        await crud_password_reset.mark_token_used(db, token_obj)

    # 使用済みトークンでリセット
    response = await client.post(
        "/api/v1/auth/reset-password",
        json={"token": raw_token, "new_password": "newpassword456"},
    )
    assert response.status_code == 400
    data = response.json()
    assert "無効または期限切れ" in data["detail"]


@pytest.mark.asyncio
async def test_reset_password_expired_token(client, setup_db):
    """期限切れトークンでのパスワードリセットテスト"""
    from datetime import datetime, timezone, timedelta

    # ユーザー登録
    await client.post(
        "/api/v1/auth/register",
        json={"email": "reset4@example.com", "password": "oldpassword123"},
    )

    # 期限切れトークンを作成
    async for db in get_db():
        user = await crud_user.get_user_by_email(db, email="reset4@example.com")
        assert user is not None
        token_obj, raw_token = await crud_password_reset.create_reset_token(db, user.id)

        # 期限を過去に設定
        token_obj.expires_at = datetime.now(timezone.utc) - timedelta(hours=1)
        await db.commit()

    # 期限切れトークンでリセット
    response = await client.post(
        "/api/v1/auth/reset-password",
        json={"token": raw_token, "new_password": "newpassword456"},
    )
    assert response.status_code == 400
    data = response.json()
    assert "無効または期限切れ" in data["detail"]
