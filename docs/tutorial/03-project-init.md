# 03. プロジェクト初期化とディレクトリ構成

この章では、バックエンドとフロントエンドのプロジェクトを初期化し、開発に必要な設定ファイルを作成します。

## ディレクトリ構成の全体像

まず、プロジェクトルートで以下のディレクトリ構造を作成します：

```bash
mkdir -p Todo
cd Todo
mkdir -p backend frontend docker docs
```

最終的な構成：

```
Todo/
├── backend/            # FastAPIプロジェクト
│   ├── app/
│   ├── migrations/
│   └── tests/
├── frontend/           # Next.jsプロジェクト
│   └── src/
├── docker/             # Dockerfile
├── docker-compose.yml
├── justfile
├── .env
└── .env.example
```

## 1. バックエンドの初期化

### uv でプロジェクトを作成

```bash
cd backend
uv init --python 3.10
```

`pyproject.toml` が生成されます。依存関係を追加します：

```bash
uv add fastapi sqlmodel asyncpg uvicorn python-jose[cryptography] passlib \
  argon2-cffi pydantic-settings python-multipart scalar-fastapi slowapi \
  python-json-logger alembic fastapi-mail jinja2 greenlet

uv add --dev pytest pytest-asyncio httpx pytest-cov psycopg2-binary polyfactory
```

### バックエンドのディレクトリ構成を作成

```bash
mkdir -p app/api/api_v1/endpoints
mkdir -p app/core
mkdir -p app/crud
mkdir -p app/middleware
mkdir -p app/models
mkdir -p app/schemas
mkdir -p app/templates/email
mkdir -p migrations/versions
mkdir -p tests
```

各ディレクトリの役割：

| ディレクトリ | 役割 |
|:---|:---|
| `app/api/` | APIルーターとエンドポイント |
| `app/core/` | 設定、セキュリティ、DB接続などの核となる機能 |
| `app/crud/` | データベースのCRUD操作 |
| `app/middleware/` | カスタムミドルウェア（ロギング、エラーハンドリング） |
| `app/models/` | SQLModelによるデータベースモデル |
| `app/schemas/` | Pydanticスキーマ（リクエスト/レスポンスの型定義） |
| `app/templates/email/` | メールテンプレート |
| `migrations/` | AlembicによるDBマイグレーション |
| `tests/` | pytestテストコード |

### 各 `__init__.py` を作成

```bash
touch app/__init__.py
touch app/api/__init__.py
touch app/api/api_v1/__init__.py
touch app/api/api_v1/endpoints/__init__.py
touch app/core/__init__.py
touch app/crud/__init__.py
touch app/middleware/__init__.py
touch app/models/__init__.py
touch app/schemas/__init__.py
```

## 2. フロントエンドの初期化

### Bun で Next.js プロジェクトを作成

```bash
cd ../frontend
bun create next-app@latest . --typescript --tailwind --eslint --app --src-dir
```

オプションの説明：
- `--typescript`: TypeScriptを使用
- `--tailwind`: Tailwind CSSをインストール
- `--eslint`: ESLintを設定
- `--app`: App Routerを使用
- `--src-dir`: `src/` ディレクトリを使用

### shadcn/ui の初期化

```bash
bunx shadcn@latest init
```

対話式のセットアップが始まります。以下のように選択してください：

- **Style**: `New York`
- **Base color**: `Zinc`
- **CSS variables**: `yes`

### 必要なコンポーネントをインストール

```bash
bunx shadcn@latest add button input card badge checkbox select label dialog
```

### フロントエンドの追加依存関係

```bash
bun add @tanstack/react-query @tanstack/react-query-devtools \
  react-hook-form @hookform/resolvers zod sonner next-themes \
  lucide-react clsx tailwind-merge class-variance-authority

bun add -D @testing-library/react @testing-library/jest-dom \
  @testing-library/react-hooks @types/jest jest jest-environment-jsdom \
  ts-jest @playwright/test playwright
```

## 3. 共通設定ファイルの作成

### docker-compose.yml

プロジェクトルートに作成します：

```yaml
services:
  db:
    image: postgres:16-alpine
    restart: always
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=tododb
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  mailpit:
    image: axllent/mailpit:latest
    restart: always
    ports:
      - "8025:8025"
      - "1025:1025"
    volumes:
      - mailpit_data:/data
    environment:
      - MP_MAX_MESSAGES=5000
      - MP_DATA_FILE=/data/mailpit.db

volumes:
  postgres_data:
  mailpit_data:
```

### justfile

プロジェクトルートに作成します：

```just
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

# Alembic 新規マイグレーションファイルを作成
db-revision:
    @if [ -z "$MESSAGE" ]; then \
        echo "Usage: just db-revision MESSAGE=\"description\""; \
        exit 1; \
    fi
    cd backend && uv run alembic revision --autogenerate -m "$MESSAGE"

# プロジェクトの状態を確認
status:
    docker compose ps
```

### .env.example

プロジェクトルートにテンプレートを作成します：

```env
# 実行環境 (development / production)
ENVIRONMENT=development

# データベース設定
POSTGRES_USER=postgres
POSTGRES_PASSWORD=password
POSTGRES_SERVER=127.0.0.1
POSTGRES_PORT=5432
POSTGRES_DB=tododb

# JWT設定
SECRET_KEY=change-me-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# CORS設定
BACKEND_CORS_ORIGINS=["http://localhost:3000","http://127.0.0.1:3000"]

# レート制限設定
RATE_LIMIT_DEFAULT=100/minute
RATE_LIMIT_LOGIN=5/minute
RATE_LIMIT_REGISTER=5/minute

# メール設定 (開発環境ではMailpitを使用)
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_TLS=false
SMTP_SSL=false
MAIL_FROM=noreply@todoapp.dev

# フロントエンドURL
FRONTEND_URL=http://localhost:3000

# パスワードリセットトークン有効期限（時間）
RESET_TOKEN_EXPIRE_HOURS=24
```

## 4. エントリーポイントの準備

### バックエンドのエントリーポイント

`backend/main.py` を作成します（開発用の簡易エントリーポイント）：

```python
import uvicorn

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
```

`backend/app/main.py` は次章以降で詳細を実装します。

### フロントエンドの開発サーバー確認

```bash
cd frontend
bun dev
```

ブラウザで `http://localhost:3000` にアクセスし、Next.js の初期画面が表示されることを確認します。

## 次のステップ

プロジェクトの初期化が完了したら、[04章: データベース層](04-backend-database.md) で SQLModel を使ったデータベースモデルと接続設定を実装します。
