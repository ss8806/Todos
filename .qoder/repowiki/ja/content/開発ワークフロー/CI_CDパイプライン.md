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
</cite>

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
本プロジェクトではGitHub Actionsを活用した継続的インテグレーション（CI）と継続的デリバリー（CD）を実現しています。主な目的は以下の通りです：
- コード品質の維持：静的解析、ユニットテスト、型チェック、ESLintによるコード整形
- 統合品質の確保：エンドツーエンドテスト（E2E）、Dockerイメージビルド検証
- 自動化されたワークフロー：プッシュ・プルリクエスト・マージ時の各フェーズでの処理を自動化

## プロジェクト構造
GitHub Actionsの設定は`.github/workflows/`ディレクトリに配置されており、以下の2つのワークフローが定義されています：
- ci.yml：ビルド・テスト・静的解析の自動化
- e2e-tests.yml：エンドツーエンドテストの実行手順

```mermaid
graph TB
subgraph "GitHub Actions"
CI["ci.yml<br/>CIワークフロー"]
E2E["e2e-tests.yml<br/>E2Eテストワークフロー"]
end
subgraph "バックエンド"
PY["backend/pyproject.toml<br/>依存関係管理"]
CFG["backend/app/core/config.py<br/>設定管理"]
MAIN["backend/app/main.py<br/>APIサーバー"]
TESTS["backend/tests/<br/>テストコード"]
end
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
E2E --> CFG
E2E --> MAIN
E2E --> PW
E2E --> E2E_TESTS
DC --> CFG
DC --> MAIN
```

**図の出典**
- [.github/workflows/ci.yml:1-200](file://.github/workflows/ci.yml#L1-L200)
- [.github/workflows/e2e-tests.yml:1-111](file://.github/workflows/e2e-tests.yml#L1-L111)

**節の出典**
- [.github/workflows/ci.yml:1-200](file://.github/workflows/ci.yml#L1-L200)
- [.github/workflows/e2e-tests.yml:1-111](file://.github/workflows/e2e-tests.yml#L1-L111)

## コアコンポーネント
### CIワークフロー（ci.yml）
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

### E2Eテストワークフロー（e2e-tests.yml）
e2e-tests.ymlは以下のプロセスを実行し、プッシュ・プルリクエスト時に自動テストを実施します：

1. **Postgresサービス起動**
   - PostgreSQL 16をサービスとして起動（5432ポート公開）

2. **依存関係インストール**
   - backend：uvによる依存関係インストール
   - frontend：Bunによる依存関係インストール

3. **Playwrightブラウザのインストール**
   - Chromiumブラウザの準備（--with-depsオプション）

4. **データベースマイグレーション**
   - Alembicを使用して最新バージョンへマイグレーション

5. **バックエンドサーバー起動**
   - UvicornでFastAPIアプリケーションを8000ポートで起動
   - 起動確認のためにOpenAPIドキュメントエンドポイントをcurlで確認

6. **フロントエンドサーバー起動**
   - Next.jsを3000ポートで起動
   - 起動確認のためにルートエンドポイントをcurlで確認

7. **E2Eテスト実行**
   - Playwrightテストを実行
   - 環境変数設定例：
     - NEXT_PUBLIC_API_URL: `http://localhost:8000/api/v1`
     - BASE_URL: `http://localhost:3000`
     - CI: `true`

8. **テスト成果の保存**
   - 成功時：Playwrightレポートをアーティファクトとして保存
   - 失敗時：テストスクリーンショットをアーティファクトとして保存

**節の出典**
- [.github/workflows/ci.yml:1-200](file://.github/workflows/ci.yml#L1-L200)
- [.github/workflows/e2e-tests.yml:1-111](file://.github/workflows/e2e-tests.yml#L1-L111)

## アーキテクチャ概観
以下は、ci.ymlのジョブ間の依存関係と実行フローを示す図です。

```mermaid
graph TB
subgraph "CIワークフロー"
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
subgraph "サービス"
PG["Postgres 16"]
end
BT --> PG
DBT --> PG
```

**図の出典**
- [.github/workflows/ci.yml:10-200](file://.github/workflows/ci.yml#L10-L200)

**節の出典**
- [.github/workflows/ci.yml:10-200](file://.github/workflows/ci.yml#L10-L200)

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
BB->>BB : docker/build-push-action実行
BB->>DB : todo-backend : latestをロード
GH->>BF : Docker Buildxセットアップ
BF->>BF : docker/build-push-action実行
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

### E2Eテスト実行フロー
e2e-tests.ymlのE2Eテストジョブは、バックエンドとフロントエンドの両方を一時的に起動し、Playwrightでエンドツーエンドテストを実施します。

```mermaid
sequenceDiagram
participant ACT as Actions Runner
participant PG as Postgresサービス
participant BE as Backendサーバー
participant FE as Frontendサーバー
participant PW as Playwright
ACT->>PG : Postgres起動5432
ACT->>ACT : 依存関係インストール
ACT->>BE : Alembicマイグレーション
ACT->>BE : Uvicorn起動8000
BE->>BE : 起動確認/api/v1/docs
ACT->>FE : Next.js起動3000
FE->>FE : 起動確認/
ACT->>PW : Playwrightテスト実行
PW-->>ACT : テスト結果とレポート
```

**図の出典**
- [.github/workflows/e2e-tests.yml:10-111](file://.github/workflows/e2e-tests.yml#L10-L111)

**節の出典**
- [.github/workflows/e2e-tests.yml:10-111](file://.github/workflows/e2e-tests.yml#L10-L111)

### 環境変数設定
ci.ymlとe2e-tests.ymlでは、環境変数をジョブレベルで設定しています。主な設定例は以下の通りです：

- Backend Testジョブ
  - DATABASE_URL: `postgresql+asyncpg://postgres:password@localhost:5432/tododb`
  - SECRET_KEY: `test-secret-key-for-ci`

- Frontend Buildジョブ
  - NEXT_PUBLIC_API_URL: `http://localhost:8000/api/v1`

- E2Eテストジョブ
  - NEXT_PUBLIC_API_URL: `http://localhost:8000/api/v1`
  - BASE_URL: `http://localhost:3000`
  - CI: `true`

これらの環境変数は、FastAPIの設定（DATABASE_URL、SECRET_KEY）やNext.jsのAPIエンドポイント（NEXT_PUBLIC_API_URL）に影響を与えます。

**節の出典**
- [.github/workflows/ci.yml:78-82](file://.github/workflows/ci.yml#L78-L82)
- [.github/workflows/ci.yml:165-167](file://.github/workflows/ci.yml#L165-L167)
- [.github/workflows/e2e-tests.yml:58-68](file://.github/workflows/e2e-tests.yml#L58-L68)
- [.github/workflows/e2e-tests.yml:77-86](file://.github/workflows/e2e-tests.yml#L77-L86)
- [.github/workflows/e2e-tests.yml:90-94](file://.github/workflows/e2e-tests.yml#L90-L94)

### Playwright設定とE2Eテスト構成
Playwrightの設定は、ci環境（CI=true）での動作を調整するために最適化されています。主な特徴は以下の通りです：

- CI環境での動作
  - forbidOnly: true（only指定のテストを禁止）
  - retries: 2回（失敗時に再試行）
  - workers: 1（並列実行を1に制限）

- テストサーバー設定
  - webServer.command: `bun dev`
  - webServer.url: `http://localhost:3000`
  - 起動タイムアウト: 120秒

- 出力設定
  - HTMLレポート出力
  - 失敗時のみスクリーンショットとビデオを記録

**節の出典**
- [frontend/playwright.config.ts:1-66](file://frontend/playwright.config.ts#L1-L66)

## 依存関係分析
ci.ymlのジョブ間の依存関係は以下の通りです：

```mermaid
graph LR
BL["Backend Lint"] --> BT["Backend Test"]
FL["Frontend Lint"] --> FT["Frontend Test"]
BL --> FB["Frontend Build"]
FB --> DBT["Docker Build Test"]
FT --> DBT
```

**図の出典**
- [.github/workflows/ci.yml:10-200](file://.github/workflows/ci.yml#L10-L200)

**節の出典**
- [.github/workflows/ci.yml:10-200](file://.github/workflows/ci.yml#L10-L200)

## パフォーマンス考慮事項
- Dockerイメージビルドの高速化
  - uv（Pythonパッケージマネージャー）の使用により、依存関係のインストールが高速化
  - Docker Buildxの利用により、マルチステージビルドの効率化が期待できる

- E2Eテストの安定性
  - Playwrightのretries設定（CI環境では2回）により、ネットワークや環境のわずかな不安定性に対応
  - workersを1に設定することで、レートリミットやリソース競合を回避

- テストの並列実行
  - E2Eテストはworkers: 1に設定されているため、並列実行は無効化されていますが、安定性を重視しています

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

- E2Eテスト失敗
  - 症状：Playwrightテストが失敗またはタイムアウト
  - 対処法：
    - 起動確認のcurlコマンドを確認（backend:8000, frontend:3000）
    - BASE_URLとNEXT_PUBLIC_API_URLの設定確認
    - CI環境変数（CI=true）の設定確認

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

**節の出典**
- [.github/workflows/ci.yml:78-90](file://.github/workflows/ci.yml#L78-L90)
- [.github/workflows/e2e-tests.yml:63-86](file://.github/workflows/e2e-tests.yml#L63-L86)
- [frontend/playwright.config.ts:59-64](file://frontend/playwright.config.ts#L59-L64)

## 結論
本プロジェクトのGitHub Actions設定は、以下の点で効果的なCI/CDパイプラインを提供しています：
- 静的解析、ユニットテスト、E2Eテスト、Dockerイメージビルドの自動化
- プッシュ・プルリクエスト・マージ時の各フェーズでの処理を明確に分離
- 環境変数を通じて、開発・テスト・本番環境の設定を柔軟に管理可能
- PlaywrightによるE2Eテストの安定性をCI環境で保つための最適化

今後の改善点としては、以下の点が考えられます：
- Dockerイメージのキャッシュ戦略の導入
- E2Eテストの並列実行（workersの増加）による実行時間短縮
- Codecovレポートの品質向上（カバレッジ基準の設定）