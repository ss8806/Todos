# Todo Project Tasks

# DBのみDockerで起動
up:
    docker compose up -d

# 開発環境を起動 (DB, Backend, Frontend すべてを一つのターミナルで実行)
dev:
    @just up
    @echo "Starting backend and frontend..."
    cd frontend && bunx concurrently \
        -n "Backend,Frontend" \
        -c "cyan,magenta" \
        "cd ../backend && uv run uvicorn app.main:app --reload" \
        "bun dev"

# データベースのログを表示
db-logs:
    docker compose logs -f db

# バックエンドのログを表示
backend-logs:
    docker compose logs -f backend

# フロントエンドのログを表示
frontend-logs:
    docker compose logs -f frontend

# ローカル開発用: バックエンドを起動 (uv)
backend-dev:
    cd backend && uv run uvicorn app.main:app --reload

# ローカル開発用: フロントエンドを起動 (bun)
frontend-dev:
    cd frontend && bun dev

# データベースの状態をリセット (ボリュームも削除)
clean-db:
    docker compose down -v
    docker compose up -d db

# Alembic マイグレーションを適用
db-migrate:
    cd backend && uv run alembic upgrade head

# Alembic マイグレーションをロールバック
db-rollback:
    cd backend && uv run alembic downgrade -1

# Alembic 新規マイグレーションファイルを作成
db-revision:
    @if [ -z "$MESSAGE" ]; then \
        echo "Usage: just db-revision MESSAGE=\"description\""; \
        exit 1; \
    fi
    cd backend && uv run alembic revision --autogenerate -m "$MESSAGE"

# Alembic 現在のバージョン確認
db-version:
    cd backend && uv run alembic current

# Alembic マイグレーション履歴確認
db-history:
    cd backend && uv run alembic history --verbose

# プロジェクトの状態を確認
status:
    docker compose ps
