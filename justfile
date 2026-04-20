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

# プロジェクトの状態を確認
status:
    docker compose ps
