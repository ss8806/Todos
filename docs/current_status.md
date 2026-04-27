# プロジェクト現状まとめ (Current Status)

このドキュメントでは、現在のプロジェクトの土台（インフラ・開発環境）の状況をまとめています。

## 1. 構築済みの環境 (Infrastructure)

### **バックエンド (Backend)**
- **Framework**: FastAPI
- **Python**: 3.13 (Docker), 3.10+ (Local)
- **Package Manager**: `uv`
- **主要ライブラリ**: `sqlmodel`, `asyncpg`, `scalar-fastapi`, `python-multipart`, `greenlet`, `uvicorn`, `python-jose`, `passlib`, `alembic`
- **エントリーポイント**: `backend/app/main.py`
- **APIドキュメント**: `/docs` (Scalar)

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
│   ├── app/
│   │   ├── api/        # エンドポイント
│   │   ├── core/       # 設定、セキュリティ、DB接続
│   │   ├── crud/       # DB操作
│   │   ├── models/     # DBモデル (SQLModel)
│   │   ├── schemas/    # Pydanticモデル
│   │   └── main.py     # エントリーポイント
├── frontend/           # Next.js + Bun
├── docker/             # Dockerfile (backend/frontend)
├── docs/               # ドキュメント
├── docker-compose.yml  # サービス管理
├── justfile            # タスクランナー
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
| DBスキーマ設計 | ✅ 完了 | SQLModelによる統合済み |
| API設計 | ✅ 完了 | 仕様書に定義済み |
| DB接続実装 | ✅ 完了 | SQLModel + AsyncSession (asyncpg) |
| 認証機能実装 | ✅ 完了 | JWT認証、ユーザー登録・ログイン・ログアウト実装済み |
| Todo機能実装 | ✅ 完了 | CRUD、検索・フィルタ・ソート・ページネーション実装済み |
| E2Eテスト | ✅ 完了 | Playwrightによる認証・Todoフローテスト実装済み |
| CI/CD | ✅ 完了 | GitHub Actionsでlint・test・build・E2E実行 |

---

## 5. 次のアクション案

1. **本番環境対応**: SECRET_KEY・CORS・DB echoの本番設定を厳密化する。
2. **パフォーマンス最適化**: フロントエンドのビルド最適化、バックエンドのクエリ最適化。
3. **追加機能検討**: Todoのカテゴリ分け、リマインダー機能、共有機能など。
