# Todoアプリ開発スキル

## 概要
このスキルは、Todoアプリの開発におけるベストプラクティスとガイダンスを提供します。

## 技術スタック
- **フロントエンド**: Next.js 16 (App Router), TypeScript, Bun, Tailwind CSS
- **バックエンド**: FastAPI, Python 3.10+, uv, SQLModel
- **データベース**: PostgreSQL 16
- **認証**: JWT (JSON Web Token)
- **コンテナ**: Docker, Docker Compose
- **バージョン管理**: Jujutsu (jj)

## 開発ルール

### バックエンド開発
1. 非同期処理を優先（async/await）
2. SQLAlchemy の AsyncSession を使用
3. Pydantic v2 のスキーマ検証
4. CRUD 操作は crud/ ディレクトリに分離
5. エラーハンドリングは HTTPException を使用

### フロントエンド開発
1. Next.js App Router パターン
2. サーバーコンポーネントを優先
3. クライアントコンポーネントには "use client" を明示
4. カスタムフックでロジックを分離
5. Tailwind CSS でスタイリング

### データベース
1. SQLModel でモデル定義
2. Alembic でマイグレーション管理
3. UUID を主キーに使用
4. 外部キー制約を適切に設定

### バージョン管理（Jujutsu）
1. コミットには必ず説明的なメッセージを追加
2. 空コミットは避ける
3. bookmark を適切に管理
4. リモート同期は `jj git push`

## コーディング規約

### Python
- PEP 8 に準拠
- タイプヒントを必須
- docstring を追加

### TypeScript
- strict mode 必須
- 明示的な型定義
- ESLint + Prettier でフォーマット

## テスト
- バックエンド: pytest
- フロントエンド: Vitest/Jest
- テストカバレッジ 80%以上を目標

## セキュリティ
- パスワードはハッシュ化（passlib）
- JWT トークンの適切な有効期限
- CORS 設定の制限
- 環境変数で機密情報管理
