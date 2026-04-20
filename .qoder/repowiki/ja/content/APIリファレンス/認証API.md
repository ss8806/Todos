# 認証API

<cite>
**このドキュメントで参照されるファイル**   
- [backend/app/main.py](file://backend/app/main.py)
- [backend/app/schemas.py](file://backend/app/schemas.py)
- [backend/app/models.py](file://backend/app/models.py)
- [backend/app/crud.py](file://backend/app/crud.py)
- [backend/app/config.py](file://backend/app/config.py)
- [backend/app/database.py](file://backend/app/database.py)
- [backend/main.py](file://backend/main.py)
</cite>

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
本ドキュメントは、Todoプロジェクトにおける認証関連APIエンドポイントを網羅的にドキュメント化することを目的としています。認証メカニズムはJWT（JSON Web Token）ベースであり、以下のエンドポイントを対象とします：
- ユーザー登録：POST /auth/register
- ログイン：POST /auth/login

本ドキュメントでは、HTTPメソッド、URLパターン、リクエストボディスキーマ、レスポンススキーマ、認証ヘッダー形式、JWTトークンの発行・検証プロセス、有効期限、再認証の仕組み、およびエラーレスポンス（400、401、404、500）の形式と原因・対処法について説明します。また、cURLやJavaScriptでの呼び出し例も提供し、クライアント側での実装サンプルを示します。

## プロジェクト構造
バックエンドはFastAPIフレームワークを使用しており、認証APIはアプリケーションのルートに直接定義されています。全体のエンドポイントはルーターを通じて管理されており、認証用のルートグループが存在します。認証ロジックは、ユーザーの登録・ログイン処理、パスワードハッシュ化、JWTトークンの発行・検証、データベース操作（CRUD）が含まれます。

```mermaid
graph TB
subgraph "バックエンド"
APP["FastAPIアプリケーション<br/>backend/app/main.py"]
ROUTER["ルーターモジュール<br/>backend/app/main.py"]
AUTH["認証ルート<br/>/auth/*"]
JWT["JWT設定<br/>backend/app/config.py"]
DB["データベース接続<br/>backend/app/database.py"]
MODELS["モデル定義<br/>backend/app/models.py"]
SCHEMAS["スキーマ定義<br/>backend/app/schemas.py"]
CRUD["CRUD操作<br/>backend/app/crud.py"]
end
APP --> ROUTER
ROUTER --> AUTH
AUTH --> JWT
AUTH --> DB
AUTH --> MODELS
AUTH --> SCHEMAS
AUTH --> CRUD
```

**図の出典**
- [backend/app/main.py](file://backend/app/main.py)
- [backend/app/config.py](file://backend/app/config.py)
- [backend/app/database.py](file://backend/app/database.py)
- [backend/app/models.py](file://backend/app/models.py)
- [backend/app/schemas.py](file://backend/app/schemas.py)
- [backend/app/crud.py](file://backend/app/crud.py)

**節の出典**
- [backend/app/main.py](file://backend/app/main.py)
- [backend/app/config.py](file://backend/app/config.py)
- [backend/app/database.py](file://backend/app/database.py)
- [backend/app/models.py](file://backend/app/models.py)
- [backend/app/schemas.py](file://backend/app/schemas.py)
- [backend/app/crud.py](file://backend/app/crud.py)

## コアコンポーネント
- FastAPIアプリケーション：ルート定義、ミドルウェア、例外ハンドリング、依存関係注入
- 認証ルート：/auth/register と /auth/login
- JWT設定：シークレットキー、トークンの有効期限、トークンの発行・検証ロジック
- データベース接続：SQLAlchemyによるORM操作
- モデル定義：ユーザー情報のテーブルスキーマ
- スキーマ定義：リクエスト・レスポンスのバリデーション
- CRUD操作：ユーザー登録・取得・更新・削除

**節の出典**
- [backend/app/main.py](file://backend/app/main.py)
- [backend/app/config.py](file://backend/app/config.py)
- [backend/app/database.py](file://backend/app/database.py)
- [backend/app/models.py](file://backend/app/models.py)
- [backend/app/schemas.py](file://backend/app/schemas.py)
- [backend/app/crud.py](file://backend/app/crud.py)

## アーキテクチャ概要
認証APIはFastAPIのルーティング機構を通じて提供され、リクエストはルーターによって処理されます。JWTは認証ヘッダーに埋め込まれ、トークンの検証後に処理が続行されます。データベース操作はCRUDモジュールを通じて行われ、スキーマに基づいてリクエスト・レスポンスがバリデーションされます。

```mermaid
sequenceDiagram
participant Client as "クライアント"
participant API as "FastAPIルーター<br/>backend/app/main.py"
participant Auth as "認証ロジック"
participant JWT as "JWT設定<br/>backend/app/config.py"
participant DB as "データベース<br/>backend/app/database.py"
Client->>API : "POST /auth/register"
API->>Auth : "ユーザー登録処理"
Auth->>JWT : "パスワードハッシュ化"
Auth->>DB : "ユーザー作成"
DB-->>Auth : "登録完了"
Auth-->>API : "登録結果"
API-->>Client : "レスポンス"
Client->>API : "POST /auth/login"
API->>Auth : "ログイン処理"
Auth->>JWT : "JWTトークン発行"
Auth->>DB : "ユーザー照会"
DB-->>Auth : "ユーザー情報"
Auth-->>API : "認証結果"
API-->>Client : "JWTトークン"
```

**図の出典**
- [backend/app/main.py](file://backend/app/main.py)
- [backend/app/config.py](file://backend/app/config.py)
- [backend/app/database.py](file://backend/app/database.py)

## 詳細コンポーネント分析

### 認証エンドポイント仕様
- エンドポイント：POST /auth/register
  - 説明：新規ユーザーを登録します
  - 認証：不要
  - リクエストボディスキーマ：ユーザー名、メールアドレス、パスワード
  - 応答：登録成功時のユーザー情報またはエラー

- エンドポイント：POST /auth/login
  - 説明：既存ユーザーの認証を行い、JWTトークンを発行します
  - 認証：不要
  - リクエストボディスキーマ：メールアドレス、パスワード
  - 応答：JWTトークンとユーザー情報、またはエラー

- 認証ヘッダー形式（保護エンドポイントへのアクセス時）
  - Authorization: Bearer <JWTトークン>
  - 例：Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

**節の出典**
- [backend/app/main.py](file://backend/app/main.py)
- [backend/app/schemas.py](file://backend/app/schemas.py)

### JWTトークンの発行・検証プロセス
- 発行プロセス
  - ログイン成功後、JWTトークンが発行されます
  - トークンにはユーザー識別情報が含まれます
  - トークンの有効期限は設定により管理されます

- 検証プロセス
  - 保護されたエンドポイントへのリクエストにはAuthorizationヘッダーが必要です
  - トークンの検証に失敗した場合、401エラーが返されます

- トークンの有効期限
  - トークンの有効期限はJWT設定で定義されています
  - 有効期限切れの場合、クライアントは再認証または再発行が必要です

- 再認証の仕組み
  - トークンの有効期限が切れた場合、再度ログインエンドポイントから新しいトークンを取得します

**節の出典**
- [backend/app/config.py](file://backend/app/config.py)
- [backend/app/main.py](file://backend/app/main.py)

### リクエスト・レスポンススキーマ
- 登録リクエストスキーマ
  - 必須フィールド：ユーザー名、メールアドレス、パスワード
  - 例：{"username": "...", "email": "...", "password": "..."}

- 登録レスポンススキーマ
  - 成功時：ユーザーID、ユーザー名、メールアドレス
  - 失敗時：エラーメッセージ、エラーコード

- ログインリクエストスキーマ
  - 必須フィールド：メールアドレス、パスワード
  - 例：{"email": "...", "password": "..."}

- ログインレスポンススキーマ
  - 成功時：JWTトークン、ユーザー情報
  - 失敗時：エラーメッセージ、エラーコード

**節の出典**
- [backend/app/schemas.py](file://backend/app/schemas.py)
- [backend/app/models.py](file://backend/app/models.py)

### 実装サンプル（cURL）
- 新規登録
  - curl -X POST "http://localhost:8000/auth/register" -H "Content-Type: application/json" -d '{"username":"...","email":"...","password":"..."}'

- ログイン
  - curl -X POST "http://localhost:8000/auth/login" -H "Content-Type: application/json" -d '{"email":"...","password":"..."}'

- 保護エンドポイントへのアクセス（認証付き）
  - curl -X GET "http://localhost:8000/protected" -H "Authorization: Bearer <JWTトークン>"

**節の出典**
- [backend/app/main.py](file://backend/app/main.py)

### 実装サンプル（JavaScript fetch）
- 新規登録
  - fetch('/auth/register', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({username:'...', email:'...', password:'...'}) })

- ログイン
  - fetch('/auth/login', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({email:'...', password:'...'}) })

- 保護エンドポイントへのアクセス（認証付き）
  - fetch('/protected', { headers: {'Authorization': 'Bearer <JWTトークン>'} })

**節の出典**
- [backend/app/main.py](file://backend/app/main.py)

## 依存性分析
認証APIは以下のモジュールに依存しています：
- 設定：JWTのシークレットキー、有効期限
- データベース：ユーザー情報の永続化
- モデル：データベーススキーマ
- スキーマ：入力バリデーション
- CRUD：データ操作

```mermaid
graph LR
MAIN["backend/app/main.py"] --> CONFIG["backend/app/config.py"]
MAIN --> DATABASE["backend/app/database.py"]
MAIN --> MODELS["backend/app/models.py"]
MAIN --> SCHEMAS["backend/app/schemas.py"]
MAIN --> CRUD["backend/app/crud.py"]
```

**図の出典**
- [backend/app/main.py](file://backend/app/main.py)
- [backend/app/config.py](file://backend/app/config.py)
- [backend/app/database.py](file://backend/app/database.py)
- [backend/app/models.py](file://backend/app/models.py)
- [backend/app/schemas.py](file://backend/app/schemas.py)
- [backend/app/crud.py](file://backend/app/crud.py)

**節の出典**
- [backend/app/main.py](file://backend/app/main.py)
- [backend/app/config.py](file://backend/app/config.py)
- [backend/app/database.py](file://backend/app/database.py)
- [backend/app/models.py](file://backend/app/models.py)
- [backend/app/schemas.py](file://backend/app/schemas.py)
- [backend/app/crud.py](file://backend/app/crud.py)

## パフォーマンス考慮事項
- JWTトークンの検証は軽量な操作ですが、頻繁な認証チェックはオーバーヘッドを伴います。必要に応じてキャッシュ戦略を検討してください。
- パスワードのハッシュ化処理は計算コストがかかるため、適切なアルゴリズムとパラメータを選択してください。
- データベース接続は接続プールを活用し、大量の同時リクエストにも耐えられるように設計してください。

## トラブルシューティングガイド
- 400 Bad Request
  - 原因：リクエストボディのバリデーションエラー、不正なJSON形式
  - 対処法：スキーマに従ってリクエストを修正し、Content-Typeをapplication/jsonに設定

- 401 Unauthorized
  - 原因：認証ヘッダーがない、JWTトークンの検証に失敗、有効期限切れ
  - 対処法：再度ログインして新しいトークンを取得し、Authorization: Bearer <JWTトークン>を設定

- 404 Not Found
  - 原因：存在しないエンドポイントへのアクセス
  - 対処法：エンドポイントURLを確認し、正しいパスを使用

- 500 Internal Server Error
  - 原因：サーバー内部エラー（DB接続エラー、JWT設定エラーなど）
  - 対処法：サーバーのログを確認し、設定やDB接続を再確認

**節の出典**
- [backend/app/main.py](file://backend/app/main.py)
- [backend/app/config.py](file://backend/app/config.py)
- [backend/app/database.py](file://backend/app/database.py)

## 結論
本ドキュメントでは、TodoプロジェクトにおけるJWTベースの認証APIについて、エンドポイント仕様、スキーマ、JWTトークンの発行・検証プロセス、エラーレスポンス、およびクライアント側での実装サンプルを網羅的に説明しました。これらの情報をもとに、安全かつ信頼性の高い認証機能をクライアント側で実装することが可能です。