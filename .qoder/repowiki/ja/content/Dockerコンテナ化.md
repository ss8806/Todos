# Dockerコンテナ化

<cite>
**このドキュメントで参照されるファイル**
- [docker-compose.yml](file://docker-compose.yml)
- [backend/Dockerfile](file://docker/backend/Dockerfile)
- [frontend/Dockerfile](file://docker/frontend/Dockerfile)
- [backend/pyproject.toml](file://backend/pyproject.toml)
- [frontend/package.json](file://frontend/package.json)
- [backend/uv.lock](file://backend/uv.lock)
- [frontend/bun.lock](file://frontend/bun.lock)
- [backend/app/main.py](file://backend/app/main.py)
- [backend/app/core/config.py](file://backend/app/core/config.py)
- [backend/app/core/logging.py](file://backend/app/core/logging.py)
- [backend/app/middleware/logging.py](file://backend/app/middleware/logging.py)
- [backend/app/middleware/error_handler.py](file://backend/app/middleware/error_handler.py)
- [backend/app/database.py](file://backend/app/database.py)
- [backend/app/models.py](file://backend/app/models.py)
- [justfile](file://justfile)
- [docs/current_status.md](file://docs/current_status.md)
- [frontend/AGENTS.md](file://frontend/AGENTS.md)
- [frontend/CLAUDE.md](file://frontend/CLAUDE.md)
</cite>

## 目次
1. [はじめに](#はじめに)
2. [プロジェクト構造](#プロジェクト構造)
3. [コアコンポーネント](#コアコンポーネント)
4. [アーキテクチャ概観](#アーキテクチャ概観)
5. [詳細コンポーネント解析](#詳細コンポーネンント解析)
6. [依存関係分析](#依存関係分析)
7. [パフォーマンス考慮事項](#パフォーマンス考慮事項)
8. [トラブルシューティングガイド](#トラブルシューティングガイド)
9. [本番環境へのデプロイ手順](#本番環境へのデプロイ手順)
10. [AI開発支援設定の統合](#ai開発支援設定の統合)
11. [結論](#結論)

## はじめに
本プロジェクトはTodoアプリケーションをDockerコンテナ化することで、開発・テスト・本番環境の一貫した実行環境を提供しています。このドキュメントでは、サービス構成（databaseのみ）、Dockerfileの内容、docker-compose.ymlの構成要素、ネットワーク設定、ボリュームマウント、環境変数の渡し方について詳細に説明します。また、コンテナの起動手順、ログの確認方法、トラブルシューティングの方法、本番環境へのデプロイ手順も網羅的に記載します。

**更新**: Docker Compose構成が大幅に簡略化され、現在はdatabaseサービスのみが定義されています。backendとfrontendのコンテナ化は個別の手順で行う必要があります。AI開発支援設定（MCP、Skill、Rule）の統合により、開発支援ツールの設定方法について補足情報を追加しました。

## プロジェクト構造
プロジェクトは以下のコンポーネントから構成されています：
- **database service**: PostgreSQL 16-alpineイメージを使用し、永続的なデータストレージを提供
- **backend service**: FastAPI + uv + uvicornを使用したAPIサーバー
- **frontend service**: Next.js + Bunを使用したフロントエンドアプリケーション

```mermaid
graph TB
subgraph "Docker Compose Services"
DB["PostgreSQL Database<br/>postgres:16-alpine"]
BACKEND["FastAPI Backend<br/>python:3.10-slim-bookworm"]
FRONTEND["Next.js Frontend<br/>oven/bun:latest"]
end
subgraph "Network"
NETWORK["Docker Network<br/>default bridge"]
end
subgraph "Volumes"
VOLUME["postgres_data<br/>永続ボリューム"]
end
DB --- VOLUME
DB --> NETWORK
BACKEND --> NETWORK
FRONTEND --> NETWORK
```

**図の出典**
- [docker-compose.yml:1-16](file://docker-compose.yml#L1-L16)
- [docker/backend/Dockerfile:1-10](file://docker/backend/Dockerfile#L1-L10)
- [docker/frontend/Dockerfile:1-8](file://docker/frontend/Dockerfile#L1-L8)

**セクションの出典**
- [docker-compose.yml:1-16](file://docker-compose.yml#L1-L16)
- [docs/current_status.md:28-49](file://docs/current_status.md#L28-L49)

## コアコンポーネント
本プロジェクトのDockerコンテナ化には以下のコンポーネントが含まれます：

### Database Service (PostgreSQL)
- **イメージ**: postgres:16-alpine
- **ポート**: 5432:5432
- **永続ボリューム**: postgres_data
- **環境変数**: POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB

### Backend Service (FastAPI)
- **イメージ**: python:3.10-slim-bookworm
- **パッケージマネージャー**: uv (Astral Sh)
- **依存関係**: FastAPI, SQLAlchemy, Pydantic, Uvicornなど
- **ポート**: 8000:8000
- **ワークディレクトリ**: /app

### Frontend Service (Next.js)
- **イメージ**: oven/bun:latest
- **ランタイム**: Bun (Bun Runtime)
- **依存関係**: Next.js 16.2.4, React 19.2.4, TypeScript, TailwindCSS
- **ポート**: 3000:3000

**セクションの出典**
- [docker-compose.yml:2-12](file://docker-compose.yml#L2-L12)
- [docker/backend/Dockerfile:1-10](file://docker/backend/Dockerfile#L1-L10)
- [docker/frontend/Dockerfile:1-8](file://docker/frontend/Dockerfile#L1-L8)
- [backend/pyproject.toml:1-23](file://backend/pyproject.toml#L1-L23)
- [frontend/package.json:1-50](file://frontend/package.json#L1-L50)

## アーキテクチャ概観
全体のシステムアーキテクチャは以下の通りです：

```mermaid
graph TB
subgraph "Dockerネットワーク"
subgraph "Database Layer"
PG["PostgreSQL 16<br/>localhost:5432"]
end
subgraph "Application Layer"
BACKEND["FastAPI Backend<br/>localhost:8000"]
FRONTEND["Next.js Frontend<br/>localhost:3000"]
end
end
subgraph "Dockerボリューム"
DATA["postgres_data<br/>永続データ"]
end
PG --> DATA
BACKEND --> PG
FRONTEND --> BACKEND
style PG fill:#fff3e0
style BACKEND fill:#e8f5e8
style FRONTEND fill:#f3e5f5
```

**図の出典**
- [docker-compose.yml:1-16](file://docker-compose.yml#L1-L16)
- [backend/app/main.py:1-23](file://backend/app/main.py#L1-L23)

### サービス間通信フロー
```mermaid
sequenceDiagram
participant Frontend as "Next.js Frontend"
participant Backend as "FastAPI Backend"
participant Database as "PostgreSQL Database"
Frontend->>Backend : HTTPリクエスト (/api/v1/*)
Backend->>Database : SQLクエリ実行
Database-->>Backend : 結果返却
Backend-->>Frontend : JSONレスポンス
Note over Frontend,Build : APIドキュメント (/docs)
```

**図の出典**
- [backend/app/main.py:106-110](file://backend/app/main.py#L106-L110)
- [backend/app/core/config.py:22-22](file://backend/app/core/config.py#L22)

## 詳細コンポーネント解析

### Database Dockerfile解析
databaseサービスのDockerfileは以下の構成になっています：

```mermaid
flowchart TD
A["FROM postgres:16-alpine"] --> B["COPY uvバイナリ"]
B --> C["WORKDIR /app"]
C --> D["COPY pyproject.toml & uv.lock"]
D --> E["RUN uv sync --frozen"]
E --> F["COPY backend/app ./app"]
F --> G["CMD uv run uvicorn"]
style A fill:#ffebee
style G fill:#e3f2fd
```

**図の出典**
- [docker/backend/Dockerfile:1-10](file://docker/backend/Dockerfile#L1-L10)

#### 依存関係管理
- **パッケージマネージャー**: uv (Astral Sh)
- **依存関係**: FastAPI, SQLAlchemy, Pydantic, Uvicornなど
- **Pythonバージョン**: >=3.10

**セクションの出典**
- [docker/backend/Dockerfile:1-10](file://docker/backend/Dockerfile#L1-L10)
- [backend/pyproject.toml:1-23](file://backend/pyproject.toml#L1-L23)

### Frontend Dockerfile解析
frontend/Dockerfileは以下の構成になっています：

```mermaid
flowchart TD
A["FROM oven/bun:latest"] --> B["WORKDIR /app"]
B --> C["COPY package.json & bun.lock"]
C --> D["RUN bun install"]
D --> E["COPY frontend/*"]
E --> F["RUN bun run build"]
F --> G["CMD bun run start"]
style A fill:#ffebee
style G fill:#e3f2fd
```

**図の出典**
- [docker/frontend/Dockerfile:1-8](file://docker/frontend/Dockerfile#L1-L8)

#### Next.js設定
- **フレームワーク**: Next.js 16.2.4
- **ランタイム**: Bun (Bun Runtime)
- **依存関係**: React 19.2.4, TypeScript, TailwindCSS

**セクションの出典**
- [docker/frontend/Dockerfile:1-8](file://docker/frontend/Dockerfile#L1-L8)
- [frontend/package.json:1-50](file://frontend/package.json#L1-L50)

### Database設定解析
PostgreSQLサービスの設定は以下の通りです：

```mermaid
erDiagram
USERS {
uuid id PK
string username UK
text hashed_password
}
TODOS {
uuid id PK
uuid user_id FK
string title
boolean is_completed
timestamp created_at
}
USERS ||--o{ TODOS : "所有者"
```

**図の出典**
- [backend/app/models.py:7-22](file://backend/app/models.py#L7-L22)

#### 接続設定
- **接続文字列**: DATABASE_URL (環境変数経由)
- **認証情報**: POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB
- **永続化**: postgres_dataボリューム

**セクションの出典**
- [docker-compose.yml:2-12](file://docker-compose.yml#L2-L12)
- [backend/app/core/config.py:24-37](file://backend/app/core/config.py#L24-L37)

### 設定管理
環境変数の管理は以下の通りです：

```mermaid
flowchart LR
subgraph "環境変数一覧"
ENV1["POSTGRES_USER"]
ENV2["POSTGRES_PASSWORD"]
ENV3["POSTGRES_DB"]
ENV4["DATABASE_URL"]
ENV5["SECRET_KEY"]
ENV6["BACKEND_CORS_ORIGINS"]
end
subgraph "設定ファイル"
CFG[".envファイル"]
PYCFG["config.py (Pydantic Settings)"]
end
ENV1 --> CFG
ENV2 --> CFG
ENV3 --> CFG
ENV4 --> CFG
ENV5 --> CFG
ENV6 --> CFG
CFG --> PYCFG
```

**図の出典**
- [docker-compose.yml:5-8](file://docker-compose.yml#L5-L8)
- [backend/app/core/config.py:24-48](file://backend/app/core/config.py#L24-L48)

**セクションの出典**
- [docker-compose.yml:5-8](file://docker-compose.yml#L5-L8)
- [backend/app/core/config.py:24-48](file://backend/app/core/config.py#L24-L48)

### ロギング設定
構造化ログの設定は以下の通りです：

```mermaid
flowchart TD
A["Logging System"] --> B["JSON Formatter"]
B --> C["Console Handler"]
C --> D["Application Logger"]
D --> E["Log Levels"]
E --> F["INFO, DEBUG, ERROR"]
```

**図の出典**
- [backend/app/core/logging.py:6-35](file://backend/app/core/logging.py#L6-L35)

**セクションの出典**
- [backend/app/core/logging.py:6-35](file://backend/app/core/logging.py#L6-L35)

## 依存関係分析
サービス間の依存関係とネットワーク構成は以下の通りです：

```mermaid
graph TB
subgraph "Docker Compose"
subgraph "Services"
DB["db (PostgreSQL)"]
BACKEND["backend (FastAPI)"]
FRONTEND["frontend (Next.js)"]
end
subgraph "Network"
NET["default network"]
end
subgraph "Volumes"
VOL["postgres_data"]
end
end
DB --> VOL
DB --> NET
BACKEND --> DB
BACKEND --> NET
FRONTEND --> BACKEND
FRONTEND --> NET
```

**図の出典**
- [docker-compose.yml:1-16](file://docker-compose.yml#L1-L16)

### 依存関係の詳細
- **db**: 常に起動（restart: always）
- **backend**: dbの起動後に起動（depends_on: db）
- **frontend**: backendの起動後に起動（depends_on: backend）

**セクションの出典**
- [docker-compose.yml:1-16](file://docker-compose.yml#L1-L16)

## パフォーマンス考慮事項
Dockerコンテナ化によるパフォーマンス特性について以下の点が重要です：

### 画像サイズと起動時間
- **database**: Alpine Linuxベースの軽量イメージ
- **backend**: slim-bookwormベースの軽量Pythonイメージ
- **frontend**: latestベースのBunイメージ

### リソース最適化
- **依存関係の固定**: uv sync --frozenにより、依存関係の固定化
- **マルチステージビルド**: 依存関係のキャッシュと再利用
- **ボリュームの永続化**: データの永続保存とコンテナの再作成時のデータ保持

### ネットワーク効率
- **内部ネットワーク**: Dockerの内部ネットワークを使用し、ホストとの通信を最小限に
- **ポートマッピング**: 必要なポートのみをホストにマッピング

## トラブルシューティングガイド

### 基本的なトラブルシューティング手順
1. **サービスの状態確認**
   ```bash
   docker compose ps
   ```

2. **ログの確認**
   ```bash
   docker compose logs -f
   docker compose logs -f db
   docker compose logs -f backend
   docker compose logs -f frontend
   ```

3. **コンテナの再起動**
   ```bash
   docker compose down
   docker compose up -d
   ```

### 共通問題と解決策

#### Database接続エラー
- **症状**: backendサービスがDBに接続できない
- **原因**: DATABASE_URLの設定ミス、DBコンテナの起動遅延
- **解決**: 
  - 環境変数の確認
  - `depends_on`の使用による起動順序の調整
  - `/health`エンドポイントでのDB接続確認

#### Port衝突エラー
- **症状**: ポート5432、8000、3000が使用中
- **解決**: 
  - 使用中のプロセスを確認して終了
  - docker-compose.ymlのポートマッピングを変更

#### 依存関係の問題
- **症状**: uv syncまたはbun installが失敗
- **解決**: 
  - `uv.lock`または`bun.lock`の更新
  - インターネット接続の確認
  - キャッシュのクリア

### 高度なトラブルシューティング
1. **コンテナ内のシェルアクセス**
   ```bash
   docker compose exec db psql -U username -d dbname
   docker compose exec backend bash
   docker compose exec frontend bash
   ```

2. **依存関係の確認**
   ```bash
   docker compose exec backend ls -la /app
   docker compose exec frontend ls -la /app
   ```

3. **ネットワークの診断**
   ```bash
   docker network ls
   docker network inspect <network_name>
   ```

**セクションの出典**
- [justfile:11-25](file://justfile#L11-L25)
- [docker-compose.yml:1-16](file://docker-compose.yml#L1-L16)

## 本番環境へのデプロイ手順

### 前準備
1. **環境変数の設定**
   - `.env`ファイルの作成
   - 本番用のDATABASE_URL、SECRET_KEYの設定

2. **イメージのビルド**
   ```bash
   docker compose build
   ```

3. **サービスの起動**
   ```bash
   docker compose up -d
   ```

### 本番環境での設定変更
- **ポート**: 外部に公開する必要のあるポートのみをマッピング
- **ボリューム**: 永続ボリュームの設定をクラウドストレージに変更
- **セキュリティ**: 
  - 認証情報の暗号化
  - HTTPSの設定
  - ファイアウォールの設定

### モニタリングとロギング
1. **コンテナの監視**
   ```bash
   docker compose ps
   docker compose stats
   ```

2. **ログの収集**
   - Dockerのログ出力設定
   - 外部ロギングサービスへの統合

3. **ヘルスチェック**
   - `/health`エンドポイントの定期監視
   - DB接続の定期確認

### スケーラビリティの考慮
- **ロードバランシング**: 複数のバックエンドコンテナの起動
- **データベースのクラスタリング**: PostgreSQLのレプリケーション設定
- **キャッシュ層**: Redisなどのキャッシュサービスの追加

## AI開発支援設定の統合

### MCP (Model Context Protocol)設定
MCPはAIモデルとの統合を可能にするプロトコルです。開発支援ツールとして以下のように統合できます：

```mermaid
flowchart TD
A["MCP Client"] --> B["AI Model Provider"]
B --> C["Context Processing"]
C --> D["Response Generation"]
D --> E["Integration Layer"]
```

**図の出典**
- [frontend/AGENTS.md:1-6](file://frontend/AGENTS.md#L1-L6)

### Skill (スキル)設定
スキルは特定のタスクを実行するためのカスタム関数です。以下のようなスキルを定義できます：

- **データベース操作スキル**: CRUD操作を自動化
- **API呼び出しスキル**: 外部APIとの連携
- **ロギングスキル**: 構造化ログの生成
- **認証スキル**: JWTトークンの処理

### Rule (ルール)設定
ルールは開発プロセスを制御するための制約条件です：

```mermaid
flowchart LR
subgraph "開発ルール"
RULE1["コード品質ルール"]
RULE2["セキュリティルール"]
RULE3["パフォーマンスルール"]
RULE4["保守性ルール"]
end
subgraph "AI支援"
MCP["MCP統合"]
SKILL["スキル実行"]
LOGIC["ロジック制御"]
end
RULE1 --> MCP
RULE2 --> SKILL
RULE3 --> LOGIC
RULE4 --> MCP
```

**図の出典**
- [frontend/AGENTS.md:1-6](file://frontend/AGENTS.md#L1-L6)

### 開発支援ツールの設定方法
1. **MCP設定ファイルの作成**
   - AIモデルプロバイダーの設定
   - コンテキストプロセッサの定義
   - 接続情報の管理

2. **スキルの定義**
   - 各スキルの実装
   - 入力/出力スキーマの定義
   - エラーハンドリングの設定

3. **ルールの適用**
   - 開発プロセスのルール設定
   - 自動検証の実装
   - 例外処理の定義

**セクションの出典**
- [frontend/AGENTS.md:1-6](file://frontend/AGENTS.md#L1-L6)
- [frontend/CLAUDE.md:1-2](file://frontend/CLAUDE.md#L1-L2)

## 結論
本プロジェクトのDockerコンテナ化は、以下の利点を提供します：
- **一貫性**: 開発・テスト・本番環境での実行環境の統一
- **移動性**: コンテナの再作成による迅速な環境セットアップ
- **スケーラビリティ**: サービスの独立性による拡張性
- **保守性**: 明確な依存関係と設定管理による運用の簡素化
- **AI支援**: MCP、Skill、Ruleの統合により、開発効率の向上

**更新**: Docker Compose構成が大幅に簡略化され、databaseサービスのみが現在の標準構成となっています。backendとfrontendのコンテナ化は個別の手順で行う必要があります。AI開発支援設定（MCP、Skill、Rule）の統合により、開発支援ツールの設定方法について補足情報を追加しました。これらのコンテナ化手法により、Todoアプリケーションは効率的かつ信頼性の高い形で運用可能になります。トラブルシューティングや本番環境へのデプロイにおいても、Docker Composeの強力な機能を活用することで、迅速な対応が可能です。