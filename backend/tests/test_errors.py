import pytest


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
