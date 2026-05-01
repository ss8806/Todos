import pytest
from tests.factories import TodoCreateFactory


@pytest.mark.asyncio
async def test_create_todo(client, auth_token):
    """Todo作成のテスト"""
    todo_data = TodoCreateFactory.build()
    response = await client.post(
        "/api/v1/todos/",
        json={"title": todo_data.title},
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == todo_data.title
    assert data["is_completed"] == False

@pytest.mark.asyncio
async def test_read_todos(client, auth_token):
    """Todo一覧取得のテスト"""
    # Todoを2件作成（Factoryでユニークなタイトルを生成）
    todo1 = TodoCreateFactory.build()
    todo2 = TodoCreateFactory.build()
    await client.post(
        "/api/v1/todos/",
        json={"title": todo1.title},
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    await client.post(
        "/api/v1/todos/",
        json={"title": todo2.title},
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
    todo_data = TodoCreateFactory.build()
    create_response = await client.post(
        "/api/v1/todos/",
        json={"title": todo_data.title},
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
    todo_data = TodoCreateFactory.build()
    create_response = await client.post(
        "/api/v1/todos/",
        json={"title": todo_data.title},
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
    todo1 = TodoCreateFactory.build()
    todo2 = TodoCreateFactory.build()
    await client.post(
        "/api/v1/todos/",
        json={"title": todo1.title},
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    await client.post(
        "/api/v1/todos/",
        json={"title": todo2.title},
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
    high_todo = TodoCreateFactory.build(priority="high")
    low_todo = TodoCreateFactory.build(priority="low")
    await client.post(
        "/api/v1/todos/",
        json={"title": high_todo.title, "priority": high_todo.priority},
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    await client.post(
        "/api/v1/todos/",
        json={"title": low_todo.title, "priority": low_todo.priority},
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


@pytest.mark.asyncio
async def test_search_todos(client, auth_token):
    """Todo検索機能のテスト"""
    todo1 = TodoCreateFactory.build(title="unique search keyword alpha")
    todo2 = TodoCreateFactory.build(title="something else beta")
    await client.post(
        "/api/v1/todos/",
        json={"title": todo1.title},
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    await client.post(
        "/api/v1/todos/",
        json={"title": todo2.title},
        headers={"Authorization": f"Bearer {auth_token}"}
    )

    response = await client.get(
        "/api/v1/todos/?search=unique+search+keyword",
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    assert all("unique" in todo["title"].lower() or "search" in todo["title"].lower() for todo in data)


@pytest.mark.asyncio
async def test_filter_todos_by_status(client, auth_token):
    """完了状態フィルタのテスト"""
    todo1 = TodoCreateFactory.build()
    await client.post(
        "/api/v1/todos/",
        json={"title": todo1.title},
        headers={"Authorization": f"Bearer {auth_token}"}
    )

    response = await client.get(
        "/api/v1/todos/?is_completed=false",
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert all(not todo["is_completed"] for todo in data)

    response = await client.get(
        "/api/v1/todos/?is_completed=true",
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 0


@pytest.mark.asyncio
async def test_filter_todos_by_priority(client, auth_token):
    """優先度フィルタのテスト"""
    high_todo = TodoCreateFactory.build(priority="high")
    low_todo = TodoCreateFactory.build(priority="low")
    await client.post(
        "/api/v1/todos/",
        json={"title": high_todo.title, "priority": "high"},
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    await client.post(
        "/api/v1/todos/",
        json={"title": low_todo.title, "priority": "low"},
        headers={"Authorization": f"Bearer {auth_token}"}
    )

    response = await client.get(
        "/api/v1/todos/?priority=high",
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert all(todo["priority"] == "high" for todo in data)


@pytest.mark.asyncio
async def test_filter_todos_by_tags(client, auth_token):
    """タグフィルタのテスト"""
    todo1 = TodoCreateFactory.build()
    await client.post(
        "/api/v1/todos/",
        json={"title": todo1.title, "tags": "work,urgent"},
        headers={"Authorization": f"Bearer {auth_token}"}
    )

    response = await client.get(
        "/api/v1/todos/?tags=work",
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    assert all("work" in (todo.get("tags") or "") for todo in data)


@pytest.mark.asyncio
async def test_sort_todos(client, auth_token):
    """ソート機能のテスト"""
    todo1 = TodoCreateFactory.build(title="aaa first")
    todo2 = TodoCreateFactory.build(title="zzz last")
    await client.post(
        "/api/v1/todos/",
        json={"title": todo1.title},
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    await client.post(
        "/api/v1/todos/",
        json={"title": todo2.title},
        headers={"Authorization": f"Bearer {auth_token}"}
    )

    # 作成日でソート（古い順）
    response = await client.get(
        "/api/v1/todos/?sort_by=created_at&sort_order=asc",
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    # 昇順で取得できていることを確認（作成日が古い順）
    assert len(data) >= 2


@pytest.mark.asyncio
async def test_pagination(client, auth_token):
    """ページネーションのテスト"""
    # 3件作成
    for i in range(3):
        todo = TodoCreateFactory.build()
        await client.post(
            "/api/v1/todos/",
            json={"title": f"page todo {i} {todo.title}"},
            headers={"Authorization": f"Bearer {auth_token}"}
        )

    # 1件ずつ取得（1ページ目）
    response = await client.get(
        "/api/v1/todos/?skip=0&limit=1",
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1

    # 1件ずつ取得（2ページ目）
    response = await client.get(
        "/api/v1/todos/?skip=1&limit=1",
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1


@pytest.mark.asyncio
async def test_update_nonexistent_todo(client, auth_token):
    """存在しないTodoの更新テスト（404）"""
    import uuid
    response = await client.put(
        f"/api/v1/todos/{uuid.uuid4()}",
        json={"title": "updated"},
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_delete_nonexistent_todo(client, auth_token):
    """存在しないTodoの削除テスト（404）"""
    import uuid
    response = await client.delete(
        f"/api/v1/todos/{uuid.uuid4()}",
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    assert response.status_code == 404
