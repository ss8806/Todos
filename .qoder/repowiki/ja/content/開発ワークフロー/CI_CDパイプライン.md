# CI/CDパイプライン

<cite>
**このドキュメントで参照されるファイル**
- [.github/workflows/ci.yml](file://.github/workflows/ci.yml)
- [.github/workflows/e2e-tests.yml](file://.github/workflows/e2e-tests.yml)
- [docker-compose.yml](file://docker-compose.yml)
- [backend/pyproject.toml](file://backend/pyproject.toml)
- [frontend/package.json](file://frontend/package.json)
- [backend/pytest.ini](file://backend/pytest.ini)
- [frontend/playwright.config.ts](file://frontend/playwright.config.ts)
- [docker/backend/Dockerfile](file://docker/backend/Dockerfile)
- [docker/frontend/Dockerfile](file://docker/frontend/Dockerfile)
- [backend/app/core/config.py](file://backend/app/core/config.py)
- [backend/app/main.py](file://backend/app/main.py)
- [backend/tests/conftest.py](file://backend/tests/conftest.py)
- [backend/app/core/logging.py](file://backend/app/core/logging.py)
- [backend/app/middleware/logging.py](file://backend/app/middleware/logging.py)
- [backend/app/core/security.py](file://backend/app/core/security.py)
- [backend/migrations/env.py](file://backend/migrations/env.py)
- [backend/alembic.ini](file://backend/alembic.ini)
- [backend/migrations/versions/000000000001_initial_schema.py](file://backend/migrations/versions/000000000001_initial_schema.py)
</cite>

## 更新要旨
**変更内容**
- GitHub Actionsワークフローの統合：ci.ymlとe2e-tests.ymlの統合により、重複する処理を排除
- Dockerコンテナ化の改善：uvとBunの導入によるパッケージ管理の高速化
- 環境変数設定の強化：設定管理クラスを通じた柔軟な環境変数対応
- **E2Eテストパイプラインの最適化：Playwrightの組み込みwebServer管理の導入により、不要なフロントエンドサーバー起動プロセスが削除されました**
- **セキュリティ強化：E2EテストでのSECRET_KEY環境変数の追加により、データベースマイグレーション時の認証が強化されました**
- ネットワーク構成の最適化：Mailpitメールサーバーの追加と設定
- モニタリング設定の追加：構造化ログとリクエストログミドルウェアの導入

## 目次
1. [イントロダクション](#イントロダクション)
2. [プロジェクト構造](#プロジェクト構造)
3. [コアコンポーネント](#コアコンポーネント)
4. [アーキテクチャ概観](#アーキテクチャ概観)
5. [詳細コンポーネント分析](#詳細コンポーネント分析)
6. [依存関係分析](#依存関係分析)
7. [パフォーマンス考慮事項](#パフォーマンス考慮事項)
8. [トラブルシューティングガイド](#トラブルシューティングガイド)
9. [結論](#結論)

## イントロダクション
本プロジェクトではGitHub Actionsを活用した統合型継続的インテグレーション（CI）と継続的デリバリー（CD）を実現しています。主な目的は以下の通りです：
- コード品質の維持：静的解析、ユニットテスト、型チェック、ESLintによるコード整形
- 統合品質の確保：エンドツーエンドテスト（E2E）、Dockerイメージビルド検証
- 自動化されたワークフロー：プッシュ・プルリクエスト・マージ時の各フェーズでの処理を自動化
- **E2Eテストパイプラインの最適化：Playwrightの組み込みwebServer管理の導入により、不要なフロントエンドサーバー起動プロセスが削除されました**
- **セキュリティ強化：E2EテストでのSECRET_KEY環境変数の追加により、データベースマイグレーション時の認証が強化されました**
- モニタリングの強化：構造化ログとリクエストログミドルウェアによる運用監視

## プロジェクト構造
GitHub Actionsの設定は`.github/workflows/`ディレクトリに配置されており、統合された1つのワークフローが定義されています：
- ci.yml：ビルド・テスト・静的解析・Dockerイメージビルドの統合ワークフロー

```mermaid
graph TB
subgraph "GitHub Actions"
CI["ci.yml<br/>統合CIワークフロー"]
E2E["e2e-tests.yml<br/>E2Eテストワークフロー"]
end
subgraph "バックエンド"
PY["backend/pyproject.toml<br/>依存関係管理"]
CFG["backend/app/core/config.py<br/>設定管理"]
SEC["backend/app/core/security.py<br/>セキュリティ設定"]
LOG["backend/app/core/logging.py<br/>ログ設定"]
MLOG["backend/app/middleware/logging.py<br/>リクエストログミドルウェア"]
MAIN["backend/app/main.py<br/>APIサーバー"]
TESTS["backend/tests/<br/>テストコード"]
ALEMBIC["backend/migrations/env.py<br/>マイグレーション設定"]
END
subgraph "フロントエンド"
PKG["frontend/package.json<br/>スクリプト管理"]
PW["frontend/playwright.config.ts<br/>E2E設定"]
E2E_TESTS["frontend/e2e/<br/>E2Eテスト"]
end
subgraph "Docker"
DBDF["docker/backend/Dockerfile<br/>バックエンドイメージ"]
FPDF["docker/frontend/Dockerfile<br/>フロントエンドイメージ"]
DC["docker-compose.yml<br/>ローカル開発"]
end
CI --> PY
CI --> PKG
CI --> DBDF
CI --> FPDF
CI --> CFG
CI --> LOG
CI --> MLOG
CI --> SEC
CI --> ALEMBIC
E2E --> CFG
E2E --> SEC
E2E --> ALEMBIC
DC --> CFG
DC --> MAIN
```

**図の出典**
- [.github/workflows/ci.yml:1-200](file://.github/workflows/ci.yml#L1-L200)
- [.github/workflows/e2e-tests.yml:1-100](file://.github/workflows/e2e-tests.yml#L1-L100)

**節の出典**
- [.github/workflows/ci.yml:1-200](file://.github/workflows/ci.yml#L1-L200)
- [.github/workflows/e2e-tests.yml:1-100](file://.github/workflows/e2e-tests.yml#L1-L100)

## コアコンポーネント
### 統合CIワークフロー（ci.yml）
ci.ymlは以下のジョブを定義し、プッシュ・プルリクエスト時に自動実行されます：

1. **Backend Lint（バックエンド静的解析）**
   - Python 3.10環境のセットアップ
   - uv（高速パッケージ管理）の導入
   - ruffによる静的解析（lint）とフォーマットチェック
   - 依存関係のインストール：`uv sync`

2. **Backend Test（バックエンドテスト）**
   - Postgres 16サービスの起動（health checks付き）
   - pytestによるユニットテスト実行（カバレッジ計測）
   - Codecovへのカバレッジレポートアップロード
   - 環境変数設定例：
     - DATABASE_URL: `postgresql+asyncpg://postgres:password@localhost:5432/tododb`
     - SECRET_KEY: `test-secret-key-for-ci`

3. **Frontend Lint（フロントエンド静的解析）**
   - Bun（最新版）のセットアップ
   - ESLintによる静的解析
   - TypeScriptの型チェック（tsc）

4. **Frontend Test（フロントエンドテスト）**
   - Jestによるユニットテスト実行（カバレッジ計測）
   - Codecovへのカバレッジレポートアップロード

5. **Frontend Build（フロントエンドビルド）**
   - Next.jsのビルド実行
   - 環境変数NEXT_PUBLIC_API_URLの設定例：`http://localhost:8000/api/v1`

6. **Docker Build Test（Dockerイメージビルド検証）**
   - 前工程（backend-lint、frontend-build）完了後に実行
   - Docker Buildxのセットアップ
   - backend/frontendそれぞれのDockerイメージをビルド（load=true）
   - タグ名：`todo-backend:latest`、`todo-frontend:latest`

**更新** Dockerコンテナ化の改善：uvとBunの導入により、パッケージ管理が高速化されました。backend/Dockerfileではuvのマルチステージビルドが採用され、frontend/DockerfileではBunの高速ビルドが実装されています。

**節の出典**
- [.github/workflows/ci.yml:1-200](file://.github/workflows/ci.yml#L1-L200)

### E2Eテストワークフロー（e2e-tests.yml）
e2e-tests.ymlはエンドツーエンドテスト専用のワークフローで、以下のジョブを定義します：

1. **E2Eテスト実行**
   - Postgres 16サービスの起動（health checks付き）
   - backend/frontendの依存関係インストール
   - Playwrightブラウザのインストール
   - **データベースマイグレーションの実行（SECRET_KEY追加）**
   - APIサーバーの起動（SECRET_KEY追加）
   - **Playwrightの組み込みwebServer管理によるフロントエンド起動**
   - E2Eテストの実行（CI環境設定）

**更新** E2Eテストパイプラインの最適化：不要なフロントエンドサーバー起動プロセスが削除され、Playwrightの組み込みwebServer管理が導入されました。これにより、ワークフローの簡略化と実行効率の向上が実現されました。

**節の出典**
- [.github/workflows/e2e-tests.yml:1-100](file://.github/workflows/e2e-tests.yml#L1-L100)

## アーキテクチャ概観
以下は、ci.ymlとe2e-tests.ymlのジョブ間の依存関係と実行フローを示す図です。

```mermaid
graph TB
subgraph "統合CIワークフロー"
BL["Backend Lint"]
BT["Backend Test"]
FL["Frontend Lint"]
FT["Frontend Test"]
FB["Frontend Build"]
DBT["Docker Build Test"]
BL --> BT
FL --> FT
BL --> FB
FB --> DBT
FT --> DBT
end
subgraph "E2Eテストワークフロー"
E2E["E2Eテスト"]
EM["データベースマイグレーション"]
AS["APIサーバー起動"]
WS["Playwright webServer管理"]
ET["E2Eテスト実行"]
E2E --> EM
EM --> AS
AS --> WS
WS --> ET
end
subgraph "サービス"
PG["Postgres 16"]
MP["Mailpit"]
end
BT --> PG
DBT --> PG
BT --> MP
EM --> PG
AS --> PG
```

**図の出典**
- [.github/workflows/ci.yml:10-200](file://.github/workflows/ci.yml#L10-L200)
- [.github/workflows/e2e-tests.yml:10-100](file://.github/workflows/e2e-tests.yml#L10-L100)
- [docker-compose.yml:14-25](file://docker-compose.yml#L14-L25)

**節の出典**
- [.github/workflows/ci.yml:10-200](file://.github/workflows/ci.yml#L10-L200)
- [.github/workflows/e2e-tests.yml:10-100](file://.github/workflows/e2e-tests.yml#L10-L100)

## 詳細コンポーネント分析

### Dockerイメージビルドプロセス
ci.ymlのDocker Build Testジョブは、バックエンドとフロントエンドのDockerイメージをそれぞれビルドします。ビルド条件はDockerfileの存在に基づいています。

```mermaid
sequenceDiagram
participant GH as GitHub Actions
participant BB as Backend Build
participant BF as Frontend Build
participant DB as Docker Registry
GH->>BB : Docker Buildxセットアップ
BB->>BB : uvマルチステージビルド
BB->>DB : todo-backend : latestをロード
GH->>BF : Docker Buildxセットアップ
BF->>BF : Bun高速ビルド
BF->>DB : todo-frontend : latestをロード
```

**図の出典**
- [.github/workflows/ci.yml:169-200](file://.github/workflows/ci.yml#L169-L200)
- [docker/backend/Dockerfile:1-10](file://docker/backend/Dockerfile#L1-L10)
- [docker/frontend/Dockerfile:1-8](file://docker/frontend/Dockerfile#L1-L8)

**節の出典**
- [.github/workflows/ci.yml:169-200](file://.github/workflows/ci.yml#L169-L200)
- [docker/backend/Dockerfile:1-10](file://docker/backend/Dockerfile#L1-L10)
- [docker/frontend/Dockerfile:1-8](file://docker/frontend/Dockerfile#L1-L8)

### 環境変数設定と設定管理
ci.ymlとe2e-tests.ymlでは、環境変数をジョブレベルで設定しています。設定管理クラスを通じて、柔軟な環境変数対応が実現されています。

- Backend Testジョブ
  - DATABASE_URL: `postgresql+asyncpg://postgres:password@localhost:5432/tododb`
  - SECRET_KEY: `test-secret-key-for-ci`

- Frontend Buildジョブ
  - NEXT_PUBLIC_API_URL: `http://localhost:8000/api/v1`

- E2Eテストジョブ（新規追加）
  - **データベースマイグレーション時**：DATABASE_URL、SECRET_KEY
  - **APIサーバー起動時**：DATABASE_URL、SECRET_KEY
  - **Playwright webServer管理時**：BASE_URL、CI環境変数

- 設定管理クラス（config.py）
  - 環境変数から読み込む設定：POSTGRES_USER、POSTGRES_PASSWORD、POSTGRES_SERVER、POSTGRES_PORT、POSTGRES_DB
  - 本番環境用設定：SECRET_KEY、ALGORITHM、ACCESS_TOKEN_EXPIRE_MINUTES
  - CORS設定：BACKEND_CORS_ORIGINS（本番環境では環境変数で厳密に制御）
  - メール設定：SMTP_HOST、SMTP_PORT、SMTP_USER、SMTP_PASSWORD、SMTP_TLS、SMTP_SSL、MAIL_FROM
  - フロントエンドURL：FRONTEND_URL
  - パスワードリセット設定：RESET_TOKEN_EXPIRE_HOURS

**更新** 環境変数設定の強化：設定管理クラスが導入され、環境変数の柔軟な対応が可能になりました。Rate Limiting設定も環境変数で制御可能となっています。E2EテストにおいてSECRET_KEY環境変数が追加され、セキュリティが強化されました。

**節の出典**
- [.github/workflows/ci.yml:78-82](file://.github/workflows/ci.yml#L78-L82)
- [.github/workflows/ci.yml:165-167](file://.github/workflows/ci.yml#L165-L167)
- [.github/workflows/e2e-tests.yml:56-83](file://.github/workflows/e2e-tests.yml#L56-L83)
- [backend/app/core/config.py:35-88](file://backend/app/core/config.py#L35-L88)

### モニタリング設定とログ管理
バックエンドには高度なモニタリング機能が実装されています。

- 構造化ログ設定（logging.py）
  - JSONフォーマットによるログ出力
  - 時刻、ログレベル、ファイル名、関数名、行番号を含む詳細なメタデータ
  - 標準出力への出力設定

- リクエストログミドルウェア（middleware/logging.py）
  - HTTPリクエスト・レスポンスの詳細なログ記録
  - 処理時間の計測とX-Process-Timeヘッダーの追加
  - エラー発生時の詳細なエラーログ出力

- JWTセキュリティ設定（core/security.py）
  - Argon2によるパスワードハッシュ化
  - JWTトークンの生成と検証
  - トークンの有効期限管理

**更新** モニタリング設定の追加：構造化ログとリクエストログミドルウェアが導入され、運用監視の強化が実現されました。JWTセキュリティ設定も強化されています。

**節の出典**
- [backend/app/core/logging.py:1-36](file://backend/app/core/logging.py#L1-L36)
- [backend/app/middleware/logging.py:1-67](file://backend/app/middleware/logging.py#L1-L67)
- [backend/app/core/security.py:1-43](file://backend/app/core/security.py#L1-L43)

### Mailpitメールサーバーの統合
docker-compose.ymlにMailpitメールサーバーが追加され、開発環境でのメールテストが可能になりました。

- Mailpitコンテナ設定
  - 画像：axllent/mailpit:latest
  - ポートマッピング：8025（Webインターフェース）、1025（SMTP）
  - 環境変数：MP_MAX_MESSAGES=5000、MP_DATA_FILE=/data/mailpit.db
  - 永続化ボリューム：mailpit_data

- 設定管理（config.py）
  - SMTP設定の環境変数対応（SMTP_HOST、SMTP_PORT、SMTP_USER、SMTP_PASSWORD、SMTP_TLS、SMTP_SSL）
  - デフォルト値としてlocalhost:1025が設定

**更新** ネットワーク構成の最適化：Mailpitメールサーバーの追加により、メール送信機能のテストが容易になりました。

**節の出典**
- [docker-compose.yml:14-25](file://docker-compose.yml#L14-L25)
- [backend/app/core/config.py:69-77](file://backend/app/core/config.py#L69-L77)

### Playwright設定とE2Eテスト構成
Playwrightの設定は、ci環境（CI=true）での動作を調整するために最適化されています。主な特徴は以下の通りです：

- CI環境での動作
  - forbidOnly: true（only指定のテストを禁止）
  - retries: 2回（失敗時に再試行）
  - workers: 1（並列実行を1に制限）

- **組み込みwebServer管理**
  - command: `bun dev`（Playwrightが自動的にフロントエンドサーバーを起動）
  - url: `http://localhost:3000`
  - reuseExistingServer: true（既存のサーバーを再利用）
  - timeout: 120秒（起動タイムアウト）

- 出力設定
  - HTMLレポート出力
  - 失敗時のみスクリーンショットとビデオを記録

**更新** E2Eテストパイプラインの最適化：Playwrightの組み込みwebServer管理が導入され、不要なフロントエンドサーバー起動プロセスが削除されました。これにより、ワークフローが簡略化され、実行効率が向上しました。

**節の出典**
- [frontend/playwright.config.ts:1-66](file://frontend/playwright.config.ts#L1-L66)

### データベースマイグレーションとセキュリティ強化
E2Eテストにおけるデータベースマイグレーションプロセスは、SECRET_KEY環境変数の追加によりセキュリティが強化されています。

```mermaid
sequenceDiagram
participant E2E as E2Eテストワークフロー
participant DB as Postgres
participant ALEMBIC as Alembic
participant SEC as 設定管理
E2E->>DB : DATABASE_URL、SECRET_KEY環境変数
E2E->>ALEMBIC : uv run alembic upgrade head
ALEMBIC->>SEC : settings.SECRET_KEY読み込み
SEC-->>ALEMBIC : 認証キー提供
ALEMBIC->>DB : マイグレーション実行
DB-->>ALEMBIC : 成功応答
ALEMBIC-->>E2E : マイグレーション完了
```

**図の出典**
- [.github/workflows/e2e-tests.yml:56-62](file://.github/workflows/e2e-tests.yml#L56-L62)
- [backend/migrations/env.py:70-80](file://backend/migrations/env.py#L70-L80)
- [backend/app/core/config.py:50-53](file://backend/app/core/config.py#L50-L53)

**節の出典**
- [.github/workflows/e2e-tests.yml:56-62](file://.github/workflows/e2e-tests.yml#L56-L62)
- [backend/migrations/env.py:70-80](file://backend/migrations/env.py#L70-L80)
- [backend/app/core/config.py:50-53](file://backend/app/core/config.py#L50-L53)

## 依存関係分析
ci.ymlとe2e-tests.ymlのジョブ間の依存関係は以下の通りです：

```mermaid
graph LR
BL["Backend Lint"] --> BT["Backend Test"]
FL["Frontend Lint"] --> FT["Frontend Test"]
BL --> FB["Frontend Build"]
FB --> DBT["Docker Build Test"]
FT --> DBT
E2E["E2Eテスト"] --> EM["データベースマイグレーション"]
EM --> AS["APIサーバー起動"]
AS --> WS["Playwright webServer管理"]
WS --> ET["E2Eテスト実行"]
```

**図の出典**
- [.github/workflows/ci.yml:10-200](file://.github/workflows/ci.yml#L10-L200)
- [.github/workflows/e2e-tests.yml:10-100](file://.github/workflows/e2e-tests.yml#L10-L100)

**節の出典**
- [.github/workflows/ci.yml:10-200](file://.github/workflows/ci.yml#L10-L200)
- [.github/workflows/e2e-tests.yml:10-100](file://.github/workflows/e2e-tests.yml#L10-L100)

## パフォーマンス考慮事項
- Dockerイメージビルドの高速化
  - uv（Pythonパッケージマネージャー）の使用により、依存関係のインストールが高速化
  - Docker Buildxの利用により、マルチステージビルドの効率化が期待できる
  - Bunの導入により、フロントエンドビルドのパフォーマンスが向上

- **E2Eテストの効率化**
  - Playwrightの組み込みwebServer管理により、不要なフロントエンドサーバー起動プロセスが削除され、実行時間が短縮されました
  - CI環境でのretries設定（2回）により、ネットワークや環境のわずかな不安定性に対応
  - workersを1に設定することで、レートリミットやリソース競合を回避
  - **SECRET_KEY環境変数の追加により、マイグレーション時の認証が強化され、テストの安定性が向上**

- テストの並列実行
  - E2Eテストはworkers: 1に設定されているため、並列実行は無効化されていますが、安定性を重視しています

**更新** Dockerコンテナ化の改善：uvとBunの導入により、パッケージ管理とビルドプロセスのパフォーマンスが大幅に向上しました。E2Eテストのセキュリティ強化により、認証プロセスの安定性が向上しました。Playwrightの組み込みwebServer管理により、ワークフローの効率化が実現されました。

**節の出典**
- [.github/workflows/ci.yml:23-30](file://.github/workflows/ci.yml#L23-L30)
- [.github/workflows/ci.yml:178-199](file://.github/workflows/ci.yml#L178-L199)
- [frontend/playwright.config.ts:13-20](file://frontend/playwright.config.ts#L13-L20)

## トラブルシューティングガイド
- Dockerイメージビルド失敗
  - 症状：Docker Build Testジョブでビルドエラー
  - 対処法：
    - Dockerfileの存在確認（backend/frontend）
    - uv.lockの整合性確認
    - Docker Buildxのバージョン確認

- **E2Eテスト失敗（更新）**
  - 症状：Playwrightテストが失敗またはタイムアウト
  - 対処法：
    - **Playwright webServerの起動確認（bun dev）**
    - BASE_URLとNEXT_PUBLIC_API_URLの設定確認
    - CI環境変数（CI=true）の設定確認
    - **SECRET_KEY環境変数の設定確認（マイグレーション時）**
    - **webServerのreuseExistingServer設定の確認**

- テストカバレッジアップロード失敗
  - 症状：Codecovへのアップロードに失敗
  - 対処法：
    - coverageレポートの出力先パス確認
    - Codecov Actionの設定確認（file、flags、name）

- Postgres接続エラー
  - 症状：Backend Test/E2EテストでDB接続失敗
  - 対処法：
    - DATABASE_URLの形式確認（postgresql+asyncpg://...）
    - Postgresサービスのhealth checks（pg_isready）確認
    - 接続ポート（5432）の開放確認

- Mailpitメールサーバー接続エラー
  - 症状：メール送信テストでエラー
  - 対処法：
    - Mailpitコンテナの起動確認（ポート8025、1025）
    - SMTP設定の確認（SMTP_HOST=localhost、SMTP_PORT=1025）
    - Mailpitデータベースの永続化確認

- 設定管理エラー
  - 症状：環境変数が正しく読み込まれない
  - 対処法：
    - .envファイルの存在確認
    - 設定クラスの環境変数読み込み確認
    - CORS設定の本番環境対応確認

- **マイグレーション認証エラー（新規追加）**
  - 症状：データベースマイグレーション時に認証エラー
  - 対処法：
    - SECRET_KEY環境変数の設定確認
    - 設定管理クラスのSECRET_KEY読み込み確認
    - JWTシークレットキーの形式確認

**更新** 新しいトラブルシューティング項目の追加：Playwright webServer管理に関するトラブルシューティングが追加されました。マイグレーション認証エラーに関する新しい項目が追加されました。

**節の出典**
- [.github/workflows/ci.yml:78-90](file://.github/workflows/ci.yml#L78-L90)
- [docker-compose.yml:14-25](file://docker-compose.yml#L14-L25)
- [backend/app/core/config.py:85-88](file://backend/app/core/config.py#L85-L88)
- [.github/workflows/e2e-tests.yml:56-83](file://.github/workflows/e2e-tests.yml#L56-L83)

## 結論
本プロジェクトのGitHub Actions設定は、以下の点で効果的なCI/CDパイプラインを提供しています：
- 静的解析、ユニットテスト、E2Eテスト、Dockerイメージビルドの統合自動化
- Dockerコンテナ化の高速化（uv、Bunの導入）
- 環境変数設定の柔軟な管理（設定管理クラスの導入）
- **E2Eテストパイプラインの最適化：Playwrightの組み込みwebServer管理の導入により、不要なフロントエンドサーバー起動プロセスが削除されました**
- **セキュリティ強化：E2EテストでのSECRET_KEY環境変数の追加により、データベースマイグレーション時の認証が強化されました**
- モニタリングの強化（構造化ログ、リクエストログミドルウェア）
- 開発環境の最適化（Mailpitメールサーバーの統合）

今後の改善点としては、以下の点が考えられます：
- Dockerイメージのキャッシュ戦略の導入
- E2Eテストの並列実行（workersの増加）による実行時間短縮
- Codecovレポートの品質向上（カバレッジ基準の設定）
- 設定管理の拡張（環境別の設定ファイルの導入）
- モニタリングの拡充（パフォーマンスメトリクスの追加）
- **セキュリティの継続的強化（認証プロセスの監視と改善）**
- **Playwright webServer管理の拡張（複数ブラウザの同時実行）**