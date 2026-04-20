# Todoアプリ 仕様書

Todoリストアプリの仕様書です。

## 1. プロジェクト概要
基本的なログイン機能とTodo管理機能を備えたWebアプリケーション。モダンなツールチェーン（Bun, uv, Jujutsu等）を採用し、開発環境を構築します。

## 2. 技術スタック

### フロントエンド
- **Framework**: Next.js (App Router)
- **Language**: TypeScript
- **Runtime**: Bun
- **Styling**: Tailwind CSS (推奨)

### バックエンド
- **Framework**: FastAPI
- **Language**: Python
- **Package Manager**: uv
- **Auth**: JWT (JSON Web Token)

### データベース / インフラ
- **Database**: PostgreSQL
- **Container**: Docker, Docker Compose

### バージョン管理
- **VCS**: Jujutsu (jj)

---

## 3. 機能要件

### 3.1 ユーザー認証 (Login)
- ユーザー登録（ユーザー名、パスワード）
- ログイン / ログアウト
- JWTによるセッション管理

### 3.2 Todoリスト機能
- Todoの表示（一覧取得）
- Todoの追加
- Todoの編集（タイトル、完了状態の更新）
- Todoの削除

---

## 4. データベース設計 (PostgreSQL)

### users テーブル
| カラム名 | 型 | 制約 | 説明 |
| :--- | :--- | :--- | :--- |
| id | UUID | Primary Key | ユーザーID |
| username | VARCHAR(50) | Unique, Not Null | ユーザー名 |
| hashed_password | TEXT | Not Null | ハッシュ化されたパスワード |

### todos テーブル
| カラム名 | 型 | 制約 | 説明 |
| :--- | :--- | :--- | :--- |
| id | UUID | Primary Key | Todo ID |
| user_id | UUID | Foreign Key (users.id) | 所有ユーザーID |
| title | VARCHAR(255) | Not Null | Todoのタイトル |
| is_completed | BOOLEAN | Default: false | 完了フラグ |
| created_at | TIMESTAMP | Default: now() | 作成日時 |

---

## 5. API設計 (FastAPI)

### 認証系
- `POST /auth/register`: ユーザー登録
- `POST /auth/login`: ログイン（トークン発行）

### Todo系
- `GET /todos`: Todo一覧取得
- `POST /todos`: 新規Todo作成
- `PATCH /todos/{id}`: Todo更新（タイトル・完了状態）
- `DELETE /todos/{id}`: Todo削除

---

## 6. ディレクトリ構造（案）

```text
todo-project/
├── docker-compose.yml
├── frontend/           # Next.js + Bun
│   ├── src/
│   ├── package.json
│   └── bun.lockb
├── backend/            # FastAPI + uv
│   ├── app/
│   ├── pyproject.toml
│   └── uv.lock
└── docker/             # Docker関連設定ファイル
    ├── frontend/
    └── backend/
```

---

## 7. 開発環境のセットアップ

プロジェクトの初期化は完了しています。`just` コマンドを使用して、簡単に操作できます。

1. **一括起動 (Docker)**:
   ```bash
   just up
   ```

2. **停止**:
   ```bash
   just down
   ```

3. **ログの確認**:
   ```bash
   just logs
   ```

4. **ローカル開発 (Dockerを使わない場合)**:
   - バックエンド: `just backend-dev`
   - フロントエンド: `just frontend-dev`

5. **Jujutsuの初期化**:
   (ローカル環境に `jj` がインストールされている場合)
   ```bash
   jj init
   ```
