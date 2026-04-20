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
- [frontend/src/lib/api.ts](file://frontend/src/lib/api.ts)
- [frontend/src/app/login/page.tsx](file://frontend/src/app/login/page.tsx)
- [frontend/src/app/register/page.tsx](file://frontend/src/app/register/page.tsx)
- [frontend/src/app/providers.tsx](file://frontend/src/app/providers.tsx)
- [frontend/src/app/layout.tsx](file://frontend/src/app/layout.tsx)
- [frontend/src/app/page.tsx](file://frontend/src/app/page.tsx)
</cite>

## 更新概要
**変更内容**
- 新しいフロントエンド認証システムの統合（ログイン/登録ページ）
- Zodスキーマによるフォームバリデーションの導入
- react-hook-formとの統合によるフォーム管理
- localStorageでのJWTトークン管理の実装
- username/password認証フローの完全なフロントエンド対応
- Next.js 14のApp Router対応とクライアントコンポーネントの利用

## 目次
1. [はじめに](#はじめに)
2. [プロジェクト構造](#プロジェクト構造)
3. [コアコンポーネント](#コアコンポーネント)
4. [アーキテクチャ概要](#アーキテクチャ概要)
5. [詳細コンポーネント分析](#詳細コンポーネント分析)
6. [フロントエンド認証フロー](#フロントエンド認証フロー)
7. [依存性分析](#依存性分析)
8. [パフォーマンス考慮事項](#パフォーランス考慮事項)
9. [トラブルシューティングガイド](#トラブルシューティングガイド)
10. [結論](#結論)

## はじめに
本ドキュメントは、Todoプロジェクトにおける認証関連APIエンドポイントを網羅的にドキュメント化することを目的としています。認証メカニズムはJWT（JSON Web Token）ベースであり、FastAPIフレームワークを使用した現代的なアーキテクチャに加え、Next.jsフロントエンドの統合を含む完全な認証システムを提供しています。以下のエンドポイントを対象とします：
- ユーザー登録：POST `/api/v1/auth/register`
- トークン取得：POST `/api/v1/auth/token`

本ドキュメントでは、HTTPメソッド、URLパターン、リクエストボディスキーマ、レスポンススキーマ、認証ヘッダー形式、JWTトークンの発行・検証プロセス、有効期限、再認証の仕組み、およびエラーレスポンス（400、401、404、500）の形式と原因・対処法について説明します。また、cURLやJavaScriptでの呼び出し例、フロントエンドでの実装サンプルを提供し、クライアント側での実装サンプルを示します。

## プロジェクト構造
バックエンドはFastAPIフレームワークを使用しており、認証APIはAPIバージョン1（/api/v1）のネームスペース下に統一的に配置されています。フロントエンドはNext.js 14のApp Routerを使用し、認証ページ（/login、/register）とメインアプリケーションが統合されています。全体のエンドポイントはルーターを通じて管理されており、認証用のルートグループが存在します。認証ロジックは、ユーザーの登録・ログイン処理、パスワードハッシュ化、JWTトークンの発行・検証、データベース操作（CRUD）が含まれます。

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
subgraph "フロントエンド"
LOGIN["ログインページ<br/>frontend/src/app/login/page.tsx"]
REGISTER["登録ページ<br/>frontend/src/app/register/page.tsx"]
API["APIライブラリ<br/>frontend/src/lib/api.ts"]
UI["UIコンポーネント<br/>frontend/src/components/ui/*"]
PROVIDERS["クエリプロバイダ<br/>frontend/src/app/providers.tsx"]
LAYOUT["レイアウト<br/>frontend/src/app/layout.tsx"]
HOME["ホーム画面<br/>frontend/src/app/page.tsx"]
end
LOGIN --> API
REGISTER --> API
HOME --> API
API --> AUTH
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
- [frontend/src/app/login/page.tsx](file://frontend/src/app/login/page.tsx)
- [frontend/src/app/register/page.tsx](file://frontend/src/app/register/page.tsx)
- [frontend/src/lib/api.ts](file://frontend/src/lib/api.ts)

**節の出典**
- [backend/app/main.py](file://backend/app/main.py)
- [backend/app/api/api_v1/api.py](file://backend/app/api/api_v1/api.py)
- [backend/app/core/security.py](file://backend/app/core/security.py)
- [backend/app/core/config.py](file://backend/app/core/config.py)
- [backend/app/models/user.py](file://backend/app/models/user.py)
- [backend/app/schemas/user.py](file://backend/app/schemas/user.py)
- [backend/app/crud/crud_user.py](file://backend/app/crud/crud_user.py)
- [backend/app/api/deps.py](file://backend/app/api/deps.py)
- [frontend/src/app/login/page.tsx](file://frontend/src/app/login/page.tsx)
- [frontend/src/app/register/page.tsx](file://frontend/src/app/register/page.tsx)
- [frontend/src/lib/api.ts](file://frontend/src/lib/api.ts)

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
- **フロントエンド統合**：Next.js 14 App Router、Zodバリデーション、react-hook-form、localStorage管理

**節の出典**
- [backend/app/main.py](file://backend/app/main.py)
- [backend/app/api/api_v1/api.py](file://backend/app/api/api_v1/api.py)
- [backend/app/core/security.py](file://backend/app/core/security.py)
- [backend/app/api/deps.py](file://backend/app/api/deps.py)
- [backend/app/core/config.py](file://backend/app/core/config.py)
- [backend/app/models/user.py](file://backend/app/models/user.py)
- [backend/app/schemas/user.py](file://backend/app/schemas/user.py)
- [backend/app/crud/crud_user.py](file://backend/app/crud/crud_user.py)
- [frontend/src/lib/api.ts](file://frontend/src/lib/api.ts)
- [frontend/src/app/login/page.tsx](file://frontend/src/app/login/page.tsx)
- [frontend/src/app/register/page.tsx](file://frontend/src/app/register/page.tsx)

## アーキテクチャ概要
認証APIはFastAPIのルーティング機構を通じて提供され、リクエストはルーターによって処理されます。JWTは認証ヘッダーに埋め込まれ、トークンの検証後に処理が続行されます。データベース操作はCRUDモジュールを通じて行われ、スキーマに基づいてリクエスト・レスポンスがバリデーションされます。OAuth2パスワードフローに準拠した認証プロセスを採用し、標準的なセキュリティスキーマを提供します。フロントエンドはNext.js 14のApp Routerを使用し、Zodスキーマによるリアルタイムバリデーション、react-hook-formによるフォーム管理、localStorageでのトークン管理を実装しています。

```mermaid
sequenceDiagram
participant Client as "クライアント"
participant Frontend as "フロントエンド<br/>Next.js 14"
participant API as "APIルーター<br/>/api/v1/auth/*"
participant Auth as "認証ロジック"
participant Security as "JWTセキュリティ<br/>backend/app/core/security.py"
participant DB as "データベース<br/>backend/app/crud/crud_user.py"
Frontend->>Client : "Zodバリデーション"
Frontend->>API : "POST /api/v1/auth/register"
API->>Auth : "ユーザー登録処理"
Auth->>Security : "パスワードハッシュ化"
Auth->>DB : "ユーザー作成"
DB-->>Auth : "登録完了"
Auth-->>API : "登録結果"
API-->>Frontend : "201 Created + User情報"
Frontend->>Frontend : "localStorageにトークン保存"
Frontend->>API : "POST /api/v1/auth/token"
API->>Auth : "ログイン処理"
Auth->>Security : "JWTトークン発行"
Auth->>DB : "ユーザー照会"
DB-->>Auth : "ユーザー情報"
Auth-->>API : "認証結果"
API-->>Frontend : "200 OK + JWTトークン"
Frontend->>Frontend : "localStorageにトークン保存"
Frontend->>API : "保護エンドポイントアクセス"
API->>Auth : "トークン検証"
Auth->>Security : "JWT検証"
Security-->>Auth : "検証成功"
Auth-->>API : "認可成功"
API-->>Frontend : "200 OK + データ"
```

**図の出典**
- [backend/app/api/api_v1/endpoints/auth.py](file://backend/app/api/api_v1/endpoints/auth.py)
- [backend/app/core/security.py](file://backend/app/core/security.py)
- [backend/app/crud/crud_user.py](file://backend/app/crud/crud_user.py)
- [frontend/src/lib/api.ts](file://frontend/src/lib/api.ts)
- [frontend/src/app/login/page.tsx](file://frontend/src/app/login/page.tsx)

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

## フロントエンド認証フロー

### Zodスキーマによるフォームバリデーション
フロントエンドではZodスキーマを使用してフォームバリデーションを実装し、リアルタイムでユーザー入力を検証します。

- ログインページのバリデーションスキーマ
  - username：3文字以上の文字列
  - password：6文字以上の文字列

- 登録ページのバリデーションスキーマ
  - username：3文字以上の文字列
  - password：6文字以上の文字列

**節の出典**
- [frontend/src/app/login/page.tsx](file://frontend/src/app/login/page.tsx)
- [frontend/src/app/register/page.tsx](file://frontend/src/app/register/page.tsx)

### react-hook-formとの統合
react-hook-formを使用してフォームを管理し、以下の機能を提供します：

- フォーム状態管理（エラーハンドリング、送信状態）
- リアルタイムバリデーション
- カスタムバリデーションエラーメッセージ表示
- 送信中のUI状態制御

**節の出典**
- [frontend/src/app/login/page.tsx](file://frontend/src/app/login/page.tsx)
- [frontend/src/app/register/page.tsx](file://frontend/src/app/register/page.tsx)

### localStorageでのトークン管理
APIライブラリはlocalStorageを使用してJWTトークンを管理し、以下のような機能を提供します：

- トークンの保存：login関数でJWTトークンをlocalStorageに保存
- トークンの取得：apiFetch関数で自動的にAuthorizationヘッダーにトークンを追加
- トークンの削除：logout関数でlocalStorageからトークンを削除

**節の出典**
- [frontend/src/lib/api.ts](file://frontend/src/lib/api.ts)

### 認証フローの完全な実装
フロントエンドの認証フローは以下の通りです：

1. **登録フロー**
   - Zodスキーマによるバリデーション
   - react-hook-formによるフォーム管理
   - API経由でのユーザー登録
   - 成功時はログインページへの遷移

2. **ログインフロー**
   - Zodスキーマによるバリデーション
   - react-hook-formによるフォーム管理
   - OAuth2パスワードフローでの認証
   - JWTトークンのlocalStorage保存
   - 成功時はホーム画面への遷移

3. **保護エンドポイントアクセス**
   - localStorageからトークンを取得
   - 自動的にAuthorizationヘッダーを設定
   - トークンの有効期限管理

**節の出典**
- [frontend/src/app/login/page.tsx](file://frontend/src/app/login/page.tsx)
- [frontend/src/app/register/page.tsx](file://frontend/src/app/register/page.tsx)
- [frontend/src/lib/api.ts](file://frontend/src/lib/api.ts)

## 依存性分析
認証APIは以下のモジュールに依存しています：
- 設定：JWTのシークレットキー、有効期限、アルゴリズム
- セキュリティ：JWTの生成・検証、パスワードハッシュ化
- 認可依存関係：OAuth2パスワードフロー準拠のトークン検証
- データベース：ユーザー情報の永続化
- モデル：データベーススキーマ
- スキーマ：入力バリデーション
- CRUD：データ操作
- **フロントエンド統合**：Next.js 14、Zod、react-hook-form、localStorage

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
FRONTEND_LOGIN["frontend/src/app/login/page.tsx"] --> API_LIB["frontend/src/lib/api.ts"]
FRONTEND_REGISTER["frontend/src/app/register/page.tsx"] --> API_LIB
FRONTEND_HOME["frontend/src/app/page.tsx"] --> API_LIB
API_LIB --> AUTH_ENDPOINTS
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
- [frontend/src/app/login/page.tsx](file://frontend/src/app/login/page.tsx)
- [frontend/src/app/register/page.tsx](file://frontend/src/app/register/page.tsx)
- [frontend/src/lib/api.ts](file://frontend/src/lib/api.ts)

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
- [frontend/src/app/login/page.tsx](file://frontend/src/app/login/page.tsx)
- [frontend/src/app/register/page.tsx](file://frontend/src/app/register/page.tsx)
- [frontend/src/lib/api.ts](file://frontend/src/lib/api.ts)

## パフォーマンス考慮事項
- JWTトークンの検証は軽量な操作ですが、頻繁な認証チェックはオーバーヘッドを伴います。必要に応じてキャッシュ戦略を検討してください。
- パスワードのハッシュ化処理（Argon2）は計算コストがかかるため、適切なパラメータを選択してください。
- データベース接続は非同期接続（asyncpg）を活用し、大量の同時リクエストにも耐えられるように設計してください。
- OAuth2パスワードフローの導入により、認証プロセスの標準化と互換性が向上しました。
- **フロントエンド最適化**：Zodバリデーションはクライアントサイドでリアルタイムに実行され、サーバーコールの回数を削減します。
- **トークン管理効率**：localStorageを使用することで、トークンの自動付与と管理が可能になり、開発効率が向上します。

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

- **フロントエンドエラー**
  - Zodバリデーションエラー：入力値を修正し、エラーメッセージに従って対処
  - トークンなしエラー：再度ログインしてトークンを取得
  - API通信エラー：ネットワーク接続を確認し、APIエンドポイントのURLを検証

**節の出典**
- [backend/app/api/api_v1/endpoints/auth.py](file://backend/app/api/api_v1/endpoints/auth.py)
- [backend/app/core/security.py](file://backend/app/core/security.py)
- [backend/app/core/config.py](file://backend/app/core/config.py)
- [backend/app/api/deps.py](file://backend/app/api/deps.py)
- [frontend/src/lib/api.ts](file://frontend/src/lib/api.ts)
- [frontend/src/app/login/page.tsx](file://frontend/src/app/login/page.tsx)
- [frontend/src/app/register/page.tsx](file://frontend/src/app/register/page.tsx)

## 結論
本ドキュメントでは、TodoプロジェクトにおけるJWTベースの認証APIについて、FastAPIフレームワークを使用した現代的なアーキテクチャ、エンドポイント仕様、スキーマ、JWTトークンの発行・検証プロセス、OAuth2パスワードフロー準拠の認証、エラーレスポンス、およびクライアント側での実装サンプルを網羅的に説明しました。特に、新たに統合されたフロントエンド認証システム（Next.js 14、Zod、react-hook-form、localStorage）により、完全な認証フローが実装されました。これらの情報をもとに、安全かつ信頼性の高い認証機能をクライアント側で実装することが可能です。新しいAPI構造と標準準拠の認証プロセス、さらにフロントエンドの統合により、より堅牢で保守しやすいシステムが実現されています。