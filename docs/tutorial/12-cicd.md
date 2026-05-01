# 12. CI/CD の設定

この章では、GitHub Actions を使ってテスト、ビルド、デプロイを自動化する方法を解説します。

## 1. CI ワークフロー

`.github/workflows/ci.yml` を作成します。

```yaml
name: CI

on:
  push:
    branches: [main, master]
  pull_request:
    branches: [main, master]

jobs:
  backend-test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: password
          POSTGRES_DB: tododb
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v4

      - name: Install uv
        uses: astral-sh/setup-uv@v3
        with:
          version: "latest"

      - name: Set up Python
        run: uv python install 3.10

      - name: Install dependencies
        run: |
          cd backend
          uv sync --all-groups

      - name: Run Alembic migrations
        run: |
          cd backend
          uv run alembic upgrade head
        env:
          SECRET_KEY: test-secret-key
          POSTGRES_SERVER: localhost

      - name: Run backend tests
        run: |
          cd backend
          uv run pytest --cov=app --cov-report=xml
        env:
          SECRET_KEY: test-secret-key
          POSTGRES_SERVER: localhost

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          files: ./backend/coverage.xml
          flags: backend

  frontend-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest

      - name: Install dependencies
        run: |
          cd frontend
          bun install

      - name: Run lint
        run: |
          cd frontend
          bun lint

      - name: Run tests
        run: |
          cd frontend
          bun test --coverage

      - name: Build
        run: |
          cd frontend
          bun run build
```

## 2. E2Eテストワークフロー

`.github/workflows/e2e-tests.yml` を作成します。

```yaml
name: E2E Tests

on:
  push:
    branches: [main, master]
  pull_request:
    branches: [main, master]

jobs:
  e2e:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: password
          POSTGRES_DB: tododb
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - name: Install uv
        uses: astral-sh/setup-uv@v3

      - name: Setup Bun
        uses: oven-sh/setup-bun@v2

      - name: Install backend dependencies
        run: |
          cd backend
          uv sync --all-groups

      - name: Install frontend dependencies
        run: |
          cd frontend
          bun install

      - name: Install Playwright
        run: |
          cd frontend
          bunx playwright install --with-deps chromium

      - name: Start backend
        run: |
          cd backend
          uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 &
        env:
          SECRET_KEY: test-secret-key
          POSTGRES_SERVER: localhost

      - name: Wait for backend
        run: |
          sleep 5
          curl --retry 10 --retry-delay 2 http://localhost:8000/health

      - name: Run E2E tests
        run: |
          cd frontend
          bun e2e
        env:
          CI: true

      - name: Upload Playwright report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: frontend/playwright-report/
          retention-days: 7
```

## 3. ワークフローの解説

### CIワークフロー（ci.yml）

| ジョブ | 内容 |
|:---|:---|
| `backend-test` | バックエンドのテスト実行、カバレッジ計測 |
| `frontend-test` | フロントエンドのlint、テスト、ビルド |

### E2Eワークフロー（e2e-tests.yml）

| ステップ | 内容 |
|:---|:---|
| サービス起動 | PostgreSQLコンテナを起動 |
| 依存関係インストール | uv、Bun、Playwright |
| バックエンド起動 | FastAPIサーバーをバックグラウンドで起動 |
| E2Eテスト実行 | Playwrightでブラウザテスト |
| レポート保存 | 失敗時のスクリーンショットをアーティファクトとして保存 |

## 4. ローカルでのCI再現

GitHub Actionsと同じ環境をローカルで再現するには、[act](https://github.com/nektos/act) を使用できます：

```bash
# actのインストール
brew install act

# CIワークフローをローカルで実行
act -j backend-test
```

## 5. バッジの設定

README.md にCIのステータスバッジを追加します：

```markdown
# Todo Application

![CI](https://github.com/YOUR_USERNAME/YOUR_REPO/workflows/CI/badge.svg)
[![codecov](https://codecov.io/gh/YOUR_USERNAME/YOUR_REPO/branch/main/graph/badge.svg)](https://codecov.io/gh/YOUR_USERNAME/YOUR_REPO)
```

## まとめ

これでTodoアプリケーションの構築チュートリアルは完了です。以下の機能を実装しました：

- **バックエンド**: FastAPI + SQLModel + PostgreSQL でのREST API
- **認証**: JWTベースのユーザー認証（登録・ログイン・パスワードリセット）
- **フロントエンド**: Next.js + shadcn/ui でのモダンUI
- **テスト**: pytest + Jest + Playwright での多層テスト
- **CI/CD**: GitHub Actions での自動化

## 次のステップ（発展課題）

- **パフォーマンス最適化**: フロントエンドのビルド最適化、バックエンドのクエリ最適化（N+1問題の対策）
- **追加機能**: Todoのカテゴリ分け、リマインダー機能、共有機能
- **オブザーバビリティ**: 構造化ログにトレースIDを追加し、リクエストの追跡性を向上
- **本番デプロイ**: Vercel（フロントエンド）+ Railway/Render（バックエンド）へのデプロイ

---

お疲れさまでした！このチュートリアルが、モダンWeb開発の学習の助けになれば幸いです。
