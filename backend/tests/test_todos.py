import pytest


@pytest.fixture
async def auth_token(client, setup_db):
    """認証トークンの取得"""
    # ユーザー登録
    await client.post(
        "/api/v1/auth/register",
        json={"username": "todouser", "password": "password123"}
    )
    
    # ログインしてトークン取得
    response = await client.post(
        "/api/v1/auth/token",
        data={"username": "todouser", "password": "password123"},
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    return response.json()["access_token"]

@pytest.mark.asyncio
async def test_create_todo(client, auth_token):
    """Todo作成のテスト"""
    response = await client.post(
        "/api/v1/todos/",
        json={"title": "Test Todo"},
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Test Todo"
    assert data["is_completed"] == False

@pytest.mark.asyncio
async def test_read_todos(client, auth_token):
    """Todo一覧取得のテスト"""
    # Todoを2件作成
    await client.post(
        "/api/v1/todos/",
        json={"title": "Todo 1"},
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    await client.post(
        "/api/v1/todos/",
        json={"title": "Todo 2"},
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    
    # 一覧取得
    response = await client.get(
        "/api/v1/todos/",
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 2

@pytest.mark.asyncio
async def test_update_todo(client, auth_token):
    """Todo更新のテスト"""
    # Todo作成
    create_response = await client.post(
        "/api/v1/todos/",
        json={"title": "Original Title"},
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    todo_id = create_response.json()["id"]
    
    # 更新（完了状態）
    response = await client.put(
        f"/api/v1/todos/{todo_id}",
        json={"is_completed": True},
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["is_completed"] == True

@pytest.mark.asyncio
async def test_delete_todo(client, auth_token):
    """Todo削除のテスト"""
    # Todo作成
    create_response = await client.post(
        "/api/v1/todos/",
        json={"title": "To Delete"},
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    todo_id = create_response.json()["id"]
    
    # 削除
    response = await client.delete(
        f"/api/v1/todos/{todo_id}",
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    assert response.status_code == 200
    
    # 削除されたことを確認
    get_response = await client.get(
        "/api/v1/todos/",
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    todos = get_response.json()
    assert not any(todo["id"] == todo_id for todo in todos)

@pytest.mark.asyncio
async def test_count_todos(client, auth_token):
    """Todo件数取得のテスト"""
    # Todoを2件作成
    await client.post(
        "/api/v1/todos/",
        json={"title": "Todo 1"},
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    await client.post(
        "/api/v1/todos/",
        json={"title": "Todo 2"},
        headers={"Authorization": f"Bearer {auth_token}"}
    )

    # 件数取得
    response = await client.get(
        "/api/v1/todos/count",
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 2

@pytest.mark.asyncio
async def test_count_todos_with_filter(client, auth_token):
    """Todo件数取得（フィルタ付き）のテスト"""
    # Todoを作成（優先度高）
    await client.post(
        "/api/v1/todos/",
        json={"title": "High Priority", "priority": "high"},
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    # Todoを作成（優先度低）
    await client.post(
        "/api/v1/todos/",
        json={"title": "Low Priority", "priority": "low"},
        headers={"Authorization": f"Bearer {auth_token}"}
    )

    # 優先度「高」でフィルタ
    response = await client.get(
        "/api/v1/todos/count?priority=high",
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 1

@pytest.mark.asyncio
async def test_unauthorized_access(client):
    """認証なしアクセスのテスト"""
    response = await client.get("/api/v1/todos/")
    assert response.status_code == 401
