# Project Context & Rules

このプロジェクトは、学習用のTodoアプリです。以下のコンテキストを常に考慮してください。

## 1. 技術スタック
- **Frontend**: Next.js (App Router), TypeScript, Bun, Tailwind CSS
- **Backend**: FastAPI, Python 3.13, uv
- **Database**: PostgreSQL (Docker Compose)
- **VCS**: Jujutsu (jj)
  - `jj describe -m` 等でコミットメッセージを記述する際は、必ず**日本語**を使用すること。
- **Task Runner**: just

## 2. 開発ルール
- **Backend**: 
  - 非同期処理（`async def`）を基本とする。
  - 型ヒントを徹底する。
  - 依存関係の追加は `uv add` を使用する。
- **Frontend**:
  - `src/` ディレクトリ配下にコードを配置する。
  - コンポーネントは `functional component` を使用する。
  - パッケージ管理は `bun` を使用する。
- **Infrastructure**:
  - `docker compose` (ハイフンなし) を使用する。
  - コマンド操作は可能な限り `justfile` に定義されたレシピを使用する。

## 3. ファイル参照
- 仕様書: [SPECIFICATION.md](file:///Users/ss/Dev/Todo/SPECIFICATION.md)
- 現状まとめ: [current_status.md](file:///Users/ss/Dev/Todo/docs/current_status.md)
- タスク定義: [justfile](file:///Users/ss/Dev/Todo/justfile)
