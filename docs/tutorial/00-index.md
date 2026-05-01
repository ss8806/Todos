# Todoアプリ構築チュートリアル

## はじめに

このチュートリアルでは、モダンなWeb開発技術を使ったTodoアプリケーションをゼロから構築する方法を学びます。

本プロジェクトは学習とポートフォリオを目的としており、以下の技術スタックを採用しています：

- **フロントエンド**: Next.js 16 (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- **バックエンド**: FastAPI + SQLModel + PostgreSQL (asyncpg)
- **認証**: JWT (python-jose) + OAuth2
- **テスト**: pytest (バックエンド) + Jest (フロントエンド) + Playwright (E2E)
- **インフラ**: Docker Compose + GitHub Actions (CI/CD)

## チュートリアルの進め方

各章は独立して読むこともできますが、初めての方は順番に進めることをお勧めします。

| 章 | タイトル | 内容 |
|:---|:---|:---|
| [01](01-introduction.md) | 技術スタックの解説 | 採用技術の概要と選定理由 |
| [02](02-environment-setup.md) | 開発環境構築 | Docker、uv、Bun、just のセットアップ |
| [03](03-project-init.md) | プロジェクト初期化 | ディレクトリ構成と各種設定ファイル |
| [04](04-backend-database.md) | データベース層 | SQLModelモデル、DB接続、Alembicマイグレーション |
| [05](05-backend-auth.md) | 認証機能 | JWT認証、ユーザー登録・ログイン・パスワードリセット |
| [06](06-backend-todo-api.md) | Todo API | CRUD操作、検索・フィルタ・ページネーション |
| [07](07-backend-middleware.md) | ミドルウェア | ロギング、エラーハンドリング、レート制限 |
| [08](08-frontend-setup.md) | フロントエンド基盤 | Next.js初期化、shadcn/ui、APIクライアント |
| [09](09-frontend-auth.md) | 認証画面 | ログイン・登録・パスワードリセット画面 |
| [10](10-frontend-todo.md) | Todo管理画面 | 一覧表示、追加、編集、フィルタ、ページネーション |
| [11](11-testing.md) | テスト | バックエンド・フロントエンド・E2Eテスト |
| [12](12-cicd.md) | CI/CD | GitHub Actionsによる自動テストとビルド |

## 前提条件

- macOS / Linux 環境（WSL2でも可）
- Docker Desktop インストール済み
- ターミナル操作の基礎知識
- Python と JavaScript/TypeScript の基礎的な理解

## リポジトリ構成

完成形のディレクトリ構成は以下のようになります：

```
Todo/
├── backend/            # FastAPI + uv
│   ├── app/
│   │   ├── api/        # APIエンドポイント
│   │   ├── core/       # 設定、セキュリティ、DB接続
│   │   ├── crud/       # DB操作
│   │   ├── middleware/ # カスタムミドルウェア
│   │   ├── models/     # SQLModelモデル
│   │   ├── schemas/    # Pydanticスキーマ
│   │   └── main.py     # アプリケーションエントリーポイント
│   ├── migrations/     # Alembicマイグレーション
│   ├── tests/          # pytestテスト
│   └── pyproject.toml  # Python依存関係
├── frontend/           # Next.js + Bun
│   ├── src/
│   │   ├── app/        # Next.js App Router
│   │   ├── components/ # UIコンポーネント
│   │   ├── hooks/      # カスタムReact Hooks
│   │   └── lib/        # ユーティリティ、APIクライアント
│   ├── e2e/            # Playwright E2Eテスト
│   └── package.json    # Node依存関係
├── docker/             # Dockerfile
├── docker-compose.yml  # サービス構成
├── justfile            # タスクランナー
└── docs/               # ドキュメント
```

## 準備ができたら

[01章: 技術スタックの解説](01-introduction.md) から始めましょう。
