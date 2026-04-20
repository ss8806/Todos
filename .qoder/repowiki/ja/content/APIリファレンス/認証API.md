# 認証API

<cite>
**このドキュメントで参照されるファイル**
- [backend/app/api/api_v1/endpoints/auth.py](file://backend/app/api/api_v1/endpoints/auth.py)
- [backend/app/api/api_v1/api.py](file://backend/app/api/api_v1/api.py)
- [backend/app/core/security.py](file://backend/app/core/security.py)
- [backend/app/core/config.py](file://backend/app/core/config.py)
- [backend/app/api/deps.py](file://backend/app/api/deps.py)
- [backend/app/crud/crud_user.py](file://backend/app/crud/crud_user.py)
- [backend/app/schemas/user.py](file://backend/app/schemas/user.py)
- [backend/app/schemas/token.py](file://backend/app/schemas/token.py)
- [backend/app/models/user.py](file://backend/app/models/user.py)
- [backend/app/main.py](file://backend/app/main.py)
</cite>

## 更新概要
**変更内容**
- FastAPIベースの認証エンドポイントの大幅刷新
- 新しいエンドポイント `/api/v1/auth/register` と `/api/v1/auth/token` の追加
- JWT認証メカニズムの詳細仕様の更新
- OAuth2パスワードフローの標準準拠
- 依存関係注入とセキュリティスキーマの統合

## 目次
1. [はじめに](#はじめに)
2. [プロジェクト構造](#プロジェクト構造)
3. [コアコンポーネント](#コアコンポーネント)
4. [アーキテクチャ概要](#アーキテクチャ概要)
5. [詳細コンポーネント分析](#詳細コンポーネント分析)
6. [依存性分析](#依存性分析)
7. [パフォーマンス考慮事項](#パフォーランス考慮事項)
8. [トラブルシューティングガイド](#トラブルシューティングガイド)
9. [結論](#結論)

## はじめに
本ドキュメントは、Todoプロジェクトにおける認証関連APIエンドポイントを網羅的にドキュメント化することを目的としています。認証メカニズムはJWT（JSON Web Token）ベースであり、FastAPIフレームワークを使用した現代的なアーキテクチャを採用しています。以下のエンドポイントを対象とします：
- ユーザー登録：POST `/api/v1/auth/register`
- トークン取得：POST `/api/v1/auth/token`

本ドキュメントでは、HTTPメソッド、URLパターン、リクエストボディスキーマ、レスポンススキーマ、認証ヘッダー形式、JWTトークンの発行・検証プロセス、有効期限、再認証の仕組み、およびエラーレスポンス（400、401、404、500）の形式と原因・対処法について説明します。また、cURLやJavaScriptでの呼び出し例も提供し、クライアント側での実装サンプルを示します。

## プロジェクト構造
バックエンドはFastAPIフレームワークを使用しており、認証APIはAPIバージョン1（/api/v1）のネームスペース下に統一的に配置されています。全体のエンドポイントはルーターを通じて管理されており、認証用のルートグループが存在します。認証ロジックは、ユーザーの登録・ログイン処理、パスワードハッシュ化、JWTトークンの発行・検証、データベース操作（CRUD）が含まれます。

```mermaid
graph TB
subgraph "バックエンド"
APP["FastAPIアプリケーション<br/>backend/app/main.py"]
ROUTER["APIルーター<br/>backend/app/api/api_v1/api.py"]
AUTH["認証ルート<br/>/api/v1/auth/*"]
SECURITY["セキュリティ<br/>backend/app/core/security.py"]
CONFIG["設定<br/>backend/app/core/config.py"]
DB["データベース接続<br/>backend/app/core/db.py"]
MODELS["モデル定義<br/>backend/app/models/user.py"]
SCHEMAS["スキーマ定義<br/>backend/app/schemas/user.py"]
CRUD["CRUD操作<br/>backend/app/crud/crud_user.py"]
DEPS["依存関係注入<br/>backend/app/api/deps.py"]
end
APP --> ROUTER
ROUTER --> AUTH
AUTH --> SECURITY
AUTH --> CONFIG
AUTH --> DB
AUTH --> MODELS
AUTH --> SCHEMAS
AUTH --> CRUD
AUTH --> DEPS
```

**図の出典**
- [backend/app/main.py](file://backend/app/main.py)
- [backend/app/api/api_v1/api.py](file://backend/app/api/api_v1/api.py)
- [backend/app/core/security.py](file://backend/app/core/security.py)
- [backend/app/core/config.py](file://backend/app/core/config.py)
- [backend/app/models/user.py](file://backend/app/models/user.py)
- [backend/app/schemas/user.py](file://backend/app/schemas/user.py)
- [backend/app/crud/crud_user.py](file://backend/app/crud/crud_user.py)
- [backend/app/api/deps.py](file://backend/app/api/deps.py)

**節の出典**
- [backend/app/main.py](file://backend/app/main.py)
- [backend/app/api/api_v1/api.py](file://backend/app/api/api_v1/api.py)
- [backend/app/core/security.py](file://backend/app/core/security.py)
- [backend/app/core/config.py](file://backend/app/core/config.py)
- [backend/app/models/user.py](file://backend/app/models/user.py)
- [backend/app/schemas/user.py](file://backend/app/schemas/user.py)
- [backend/app/crud/crud_user.py](file://backend/app/crud/crud_user.py)
- [backend/app/api/deps.py](file://backend/app/api/deps.py)

## コアコンポーネント
- FastAPIアプリケーション：ルート定義、ミドルウェア、例外ハンドリング、依存関係注入
- APIルーター：バージョン管理されたエンドポイントグループ
- 認証ルート：/api/v1/auth/register と /api/v1/auth/token
- JWTセキュリティ：シークレットキー、トークンの有効期限、トークンの発行・検証ロジック
- 認可依存関係：OAuth2パスワードフロー準拠のトークン検証
- 設定管理：環境変数ベースの設定、JWTアルゴリズム、有効期限
- データベース接続：SQLAlchemyによるORM操作
- モデル定義：ユーザー情報のテーブルスキーマ
- スキーマ定義：リクエスト・レスポンスのバリデーション
- CRUD操作：ユーザー登録・取得・更新・削除

**節の出典**
- [backend/app/main.py](file://backend/app/main.py)
- [backend/app/api/api_v1/api.py](file://backend/app/api/api_v1/api.py)
- [backend/app/core/security.py](file://backend/app/core/security.py)
- [backend/app/api/deps.py](file://backend/app/api/deps.py)
- [backend/app/core/config.py](file://backend/app/core/config.py)
- [backend/app/models/user.py](file://backend/app/models/user.py)
- [backend/app/schemas/user.py](file://backend/app/schemas/user.py)
- [backend/app/crud/crud_user.py](file://backend/app/crud/crud_user.py)

## アーキテクチャ概要
認証APIはFastAPIのルーティング機構を通じて提供され、リクエストはルーターによって処理されます。JWTは認証ヘッダーに埋め込まれ、トークンの検証後に処理が続行されます。データベース操作はCRUDモジュールを通じて行われ、スキーマに基づいてリクエスト・レスポンスがバリデーションされます。OAuth2パスワードフローに準拠した認証プロセスを採用し、標準的なセキュリティスキーマを提供します。

```mermaid
sequenceDiagram
participant Client as "クライアント"
participant API as "APIルーター<br/>/api/v1/auth/*"
participant Auth as "認証ロジック"
participant Security as "JWTセキュリティ<br/>backend/app/core/security.py"
participant DB as "データベース<br/>backend/app/crud/crud_user.py"
Client->>API : "POST /api/v1/auth/register"
API->>Auth : "ユーザー登録処理"
Auth->>Security : "パスワードハッシュ化"
Auth->>DB : "ユーザー作成"
DB-->>Auth : "登録完了"
Auth-->>API : "登録結果"
API-->>Client : "201 Created + User情報"
Client->>API : "POST /api/v1/auth/token"
API->>Auth : "ログイン処理"
Auth->>Security : "JWTトークン発行"
Auth->>DB : "ユーザー照会"
DB-->>Auth : "ユーザー情報"
Auth-->>API : "認証結果"
API-->>Client : "200 OK + JWTトークン"
```

**図の出典**
- [backend/app/api/api_v1/endpoints/auth.py](file://backend/app/api/api_v1/endpoints/auth.py)
- [backend/app/core/security.py](file://backend/app/core/security.py)
- [backend/app/crud/crud_user.py](file://backend/app/crud/crud_user.py)

## 詳細コンポーネント分析

### 認証エンドポイント仕様
- エンドポイント：POST `/api/v1/auth/register`
  - 説明：新規ユーザーを登録します
  - 認証：不要
  - リクエストボディスキーマ：username、password
  - 応答：201 Created + 登録されたユーザー情報（id、username）
  - 重複エラー：400 Bad Request（ユーザー名が既に存在）

- エンドポイント：POST `/api/v1/auth/token`
  - 説明：OAuth2パスワードフローに準拠した認証を行い、JWTアクセストークンを発行します
  - 認証：不要（OAuth2パスワードフロー）
  - リクエストボディスキーマ：form-data（username、password）
  - 応答：200 OK + JWTトークン（access_token、token_type）
  - 認証エラー：401 Unauthorized（認証失敗）

- 認証ヘッダー形式（保護エンドポイントへのアクセス時）
  - Authorization: Bearer <JWTトークン>
  - 例：Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

**節の出典**
- [backend/app/api/api_v1/endpoints/auth.py](file://backend/app/api/api_v1/endpoints/auth.py)
- [backend/app/schemas/user.py](file://backend/app/schemas/user.py)
- [backend/app/schemas/token.py](file://backend/app/schemas/token.py)

### JWTトークンの発行・検証プロセス
- 発行プロセス
  - OAuth2パスワードフローに準拠した認証後、JWTトークンが発行されます
  - トークンにはユーザー識別情報（username）が含まれます
  - トークンの有効期限は30分（設定可能）で管理されます
  - HS256アルゴリズムを使用した署名が行われます

- 検証プロセス
  - 保護されたエンドポイントへのリクエストにはAuthorizationヘッダーが必要です
  - トークンの検証に失敗した場合、401エラーが返されます
  - 依存関係注入を通じて自動的にトークン検証が実行されます

- トークンの有効期限
  - トークンの有効期限は設定で定義されています（ACCESS_TOKEN_EXPIRE_MINUTES）
  - 有効期限切れの場合、クライアントは再度ログインまたは再発行が必要です

- 再認証の仕組み
  - トークンの有効期限が切れた場合、再度 `/api/v1/auth/token` エンドポイントから新しいトークンを取得します

**節の出典**
- [backend/app/core/security.py](file://backend/app/core/security.py)
- [backend/app/core/config.py](file://backend/app/core/config.py)
- [backend/app/api/deps.py](file://backend/app/api/deps.py)

### リクエスト・レスポンススキーマ
- 登録リクエストスキーマ
  - 必須フィールド：username、password
  - 例：{"username": "user123", "password": "securepassword"}

- 登録レスポンススキーマ
  - 成功時：201 Created + {"id": "uuid", "username": "user123"}
  - 失敗時：400 Bad Request + エラーメッセージ

- トークン取得リクエストスキーマ
  - 必須フィールド：form-data（username、password）
  - 例：form-data: username=user123, password=securepassword

- トークン取得レスポンススキーマ
  - 成功時：200 OK + {"access_token": "eyJhbG...", "token_type": "bearer"}
  - 失敗時：401 Unauthorized + エラーメッセージ

**節の出典**
- [backend/app/schemas/user.py](file://backend/app/schemas/user.py)
- [backend/app/schemas/token.py](file://backend/app/schemas/token.py)
- [backend/app/models/user.py](file://backend/app/models/user.py)

### 実装サンプル（cURL）
- 新規登録
  - curl -X POST "http://localhost:8000/api/v1/auth/register" -H "Content-Type: application/json" -d '{"username":"user123","password":"securepassword"}'

- トークン取得（OAuth2パスワードフロー）
  - curl -X POST "http://localhost:8000/api/v1/auth/token" -d "username=user123&password=securepassword"

- 保護エンドポイントへのアクセス（認証付き）
  - curl -X GET "http://localhost:8000/api/v1/users/me" -H "Authorization: Bearer <JWTトークン>"

**節の出典**
- [backend/app/api/api_v1/endpoints/auth.py](file://backend/app/api/api_v1/endpoints/auth.py)
- [backend/app/api/deps.py](file://backend/app/api/deps.py)

### 実装サンプル（JavaScript fetch）
- 新規登録
  - fetch('/api/v1/auth/register', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({username:'user123', password:'securepassword'}) })

- トークン取得（OAuth2パスワードフロー）
  - const formData = new FormData();
  - formData.append('username', 'user123');
  - formData.append('password', 'securepassword');
  - fetch('/api/v1/auth/token', { method: 'POST', body: formData })

- 保護エンドポイントへのアクセス（認証付き）
  - fetch('/api/v1/users/me', { headers: {'Authorization': 'Bearer <JWTトークン>'} })

**節の出典**
- [backend/app/api/api_v1/endpoints/auth.py](file://backend/app/api/api_v1/endpoints/auth.py)
- [backend/app/api/deps.py](file://backend/app/api/deps.py)

## 依存性分析
認証APIは以下のモジュールに依存しています：
- 設定：JWTのシークレットキー、有効期限、アルゴリズム
- セキュリティ：JWTの生成・検証、パスワードハッシュ化
- 認可依存関係：OAuth2パスワードフロー準拠のトークン検証
- データベース：ユーザー情報の永続化
- モデル：データベーススキーマ
- スキーマ：入力バリデーション
- CRUD：データ操作

```mermaid
graph LR
MAIN["backend/app/main.py"] --> API_ROUTER["backend/app/api/api_v1/api.py"]
API_ROUTER --> AUTH_ENDPOINTS["backend/app/api/api_v1/endpoints/auth.py"]
AUTH_ENDPOINTS --> SECURITY["backend/app/core/security.py"]
AUTH_ENDPOINTS --> CONFIG["backend/app/core/config.py"]
AUTH_ENDPOINTS --> CRUD_USER["backend/app/crud/crud_user.py"]
AUTH_ENDPOINTS --> SCHEMAS_USER["backend/app/schemas/user.py"]
AUTH_ENDPOINTS --> SCHEMAS_TOKEN["backend/app/schemas/token.py"]
AUTH_ENDPOINTS --> MODELS_USER["backend/app/models/user.py"]
AUTH_ENDPOINTS --> DEPS["backend/app/api/deps.py"]
```

**図の出典**
- [backend/app/main.py](file://backend/app/main.py)
- [backend/app/api/api_v1/api.py](file://backend/app/api/api_v1/api.py)
- [backend/app/api/api_v1/endpoints/auth.py](file://backend/app/api/api_v1/endpoints/auth.py)
- [backend/app/core/security.py](file://backend/app/core/security.py)
- [backend/app/core/config.py](file://backend/app/core/config.py)
- [backend/app/crud/crud_user.py](file://backend/app/crud/crud_user.py)
- [backend/app/schemas/user.py](file://backend/app/schemas/user.py)
- [backend/app/schemas/token.py](file://backend/app/schemas/token.py)
- [backend/app/models/user.py](file://backend/app/models/user.py)
- [backend/app/api/deps.py](file://backend/app/api/deps.py)

**節の出典**
- [backend/app/main.py](file://backend/app/main.py)
- [backend/app/api/api_v1/api.py](file://backend/app/api/api_v1/api.py)
- [backend/app/api/api_v1/endpoints/auth.py](file://backend/app/api/api_v1/endpoints/auth.py)
- [backend/app/core/security.py](file://backend/app/core/security.py)
- [backend/app/core/config.py](file://backend/app/core/config.py)
- [backend/app/crud/crud_user.py](file://backend/app/crud/crud_user.py)
- [backend/app/schemas/user.py](file://backend/app/schemas/user.py)
- [backend/app/schemas/token.py](file://backend/app/schemas/token.py)
- [backend/app/models/user.py](file://backend/app/models/user.py)
- [backend/app/api/deps.py](file://backend/app/api/deps.py)

## パフォーマンス考慮事項
- JWTトークンの検証は軽量な操作ですが、頻繁な認証チェックはオーバーヘッドを伴います。必要に応じてキャッシュ戦略を検討してください。
- パスワードのハッシュ化処理（Argon2）は計算コストがかかるため、適切なパラメータを選択してください。
- データベース接続は非同期接続（asyncpg）を活用し、大量の同時リクエストにも耐えられるように設計してください。
- OAuth2パスワードフローの導入により、認証プロセスの標準化と互換性が向上しました。

## トラブルシューティングガイド
- 400 Bad Request
  - 原因：リクエストボディのバリデーションエラー、既存ユーザー名の重複
  - 対処法：スキーマに従ってリクエストを修正し、Content-Typeをapplication/jsonに設定

- 401 Unauthorized
  - 原因：認証ヘッダーがない、JWTトークンの検証に失敗、有効期限切れ、認証失敗
  - 対処法：再度ログインして新しいトークンを取得し、Authorization: Bearer <JWTトークン>を設定

- 404 Not Found
  - 原因：存在しないエンドポイントへのアクセス
  - 対処法：エンドポイントURLを確認し、正しい `/api/v1/` ネームスペースを使用

- 500 Internal Server Error
  - 原因：サーバー内部エラー（DB接続エラー、JWT設定エラー、パスワードハッシュ化エラー）
  - 対処法：サーバーのログを確認し、設定やDB接続を再確認

**節の出典**
- [backend/app/api/api_v1/endpoints/auth.py](file://backend/app/api/api_v1/endpoints/auth.py)
- [backend/app/core/security.py](file://backend/app/core/security.py)
- [backend/app/core/config.py](file://backend/app/core/config.py)
- [backend/app/api/deps.py](file://backend/app/api/deps.py)

## 結論
本ドキュメントでは、TodoプロジェクトにおけるJWTベースの認証APIについて、FastAPIフレームワークを使用した現代的なアーキテクチャ、エンドポイント仕様、スキーマ、JWTトークンの発行・検証プロセス、OAuth2パスワードフロー準拠の認証、エラーレスポンス、およびクライアント側での実装サンプルを網羅的に説明しました。これらの情報をもとに、安全かつ信頼性の高い認証機能をクライアント側で実装することが可能です。新しいAPI構造と標準準拠の認証プロセスにより、より堅牢で保守しやすいシステムが実現されています。