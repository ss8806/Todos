# Todo Project Tasks

# 全てのサービス（DB, backend, frontend）をDockerで起動
up:
    docker compose up -d --build

# 全てのサービスを停止
down:
    docker compose down

# ログを表示
logs:
    docker compose logs -f

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

# プロジェクトの状態を確認
status:
    docker compose ps
