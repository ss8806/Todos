# プロジェクト現状まとめ (Current Status)

このドキュメントでは、現在のプロジェクトの土台（インフラ・開発環境）の状況をまとめています。

## 1. 構築済みの環境 (Infrastructure)

### **バックエンド (Backend)**
- **Framework**: FastAPI
- **Python**: 3.13 (Docker), 3.10+ (Local)
- **Package Manager**: `uv`
- **主要ライブラリ**: `fastapi`, `uvicorn`, `sqlalchemy`, `psycopg2-binary`, `python-jose`, `passlib`, `alembic`
- **エントリーポイント**: `backend/app/main.py`

### **フロントエンド (Frontend)**
- **Framework**: Next.js (App Router)
- **Language**: TypeScript
- **Runtime**: `bun`
- **Styling**: Tailwind CSS
- **エントリーポイント**: `frontend/src/app/page.tsx`

### **データベース (Database)**
- **Engine**: PostgreSQL 16
- **管理**: Docker Compose

---

## 2. プロジェクト構成 (Project Structure)

```text
Todo/
├── backend/            # FastAPI + uv
├── frontend/           # Next.js + Bun
├── docker/             # Dockerfile (backend/frontend)
├── docs/               # ドキュメント (本ファイル)
├── docker-compose.yml  # サービス管理
├── justfile            # タスクランナー (コマンド集)
└── SPECIFICATION.md    # アプリ仕様書
```

---

## 3. 現在利用可能なタスク (Commands)

`just` コマンドを使用して、主要な操作が可能です。

| コマンド | 内容 |
| :--- | :--- |
| `just up` | Dockerで全サービスを一括起動 |
| `just down` | サービスを停止 |
| `just logs` | ログをリアルタイム表示 |
| `just backend-dev` | ローカルでバックエンドを起動 (uv run) |
| `just frontend-dev` | ローカルでフロントエンドを起動 (bun dev) |

---

## 4. 進捗状況 (Progress)

| カテゴリ | ステータス | 詳細 |
| :--- | :--- | :--- |
| インフラ構築 | ✅ 完了 | Docker, DB, Network設定済み |
| プロジェクト初期化 | ✅ 完了 | backend(uv), frontend(bun) 初期化済み |
| DBスキーマ設計 | ✅ 完了 | 仕様書に定義済み |
| API設計 | ✅ 完了 | 仕様書に定義済み |
| DB接続実装 | ⏳ 未着手 | SQLAlchemyの設定が必要 |
| 認証機能実装 | ⏳ 未着手 | JWT, Login/Registerが必要 |
| Todo機能実装 | ⏳ 未着手 | CRUDのAPIとUIが必要 |

---

## 5. 次のアクション案

1. **DB接続の確立**: `backend/app` 内に `database.py` を作成し、PostgreSQLとの接続を実装する。
2. **マイグレーションの設定**: `alembic` を初期化し、テーブルを作成する。
3. **認証の実装**: ユーザーモデルの作成とログインAPIの実装。
