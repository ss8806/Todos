# 認証機能 詳細仕様書 (Auth Specification)

本ドキュメントでは、Todoアプリにおけるユーザー認証（登録・ログイン）の詳細仕様を定義します。

## 1. 認証方式
- **方式**: JWT (JSON Web Token) によるステートレス認証
- **トークン保持**: **localStorage + Cookie のデュアル方式**
  - API リクエスト時は localStorage からトークンを取得して `Authorization: Bearer` ヘッダーに付与
  - Next.js ミドルウェアでの認証チェック用に Cookie も併存（`SameSite=Strict`、HTTPS 時は `Secure` 属性付与）
  - Cookie の有効期限: 7日間（localStorage と同期）
- **アルゴリズム**: HS256
- **アクセストークン有効期限**: 30分（設定可能）

## 2. API エンドポイント

### 2.1 ユーザー登録 (`POST /auth/register`)
ユーザーを新規作成します。

- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "securepassword"
  }
  ```
- **Response (Success 201)**:
  ```json
  {
    "id": "uuid",
    "email": "user@example.com"
  }
  ```
- **Error**: メールアドレスが既に存在する場合は 400 Bad Request。

### 2.2 ログイン (`POST /auth/token`)
ユーザー認証を行い、アクセストークンを発行します。
※ FastAPI の標準的な OAuth2 パスワードフローに準拠し、`username` と `password` を form-data で受け取ります。

- **Request (form-data)**:
  - `username`: メールアドレス（OAuth2 標準フィールド名のため `username`）
  - `password`: パスワード
- **Response (Success 200)**:
  ```json
  {
    "access_token": "eyJhbG...",
    "token_type": "bearer"
  }
  ```
- **Error**: 認証失敗時は 401 Unauthorized。

### 2.3 パスワードリセットメール送信 (`POST /auth/forgot-password`)
パスワードリセット用のトークンを生成し、メールを送信します。

- **Request Body**:
  ```json
  {
    "email": "user@example.com"
  }
  ```
- **Response (Success 200)**:
  ```json
  {
    "message": "パスワードリセットのメールを送信しました。メールボックスをご確認ください。"
  }
  ```
- **注意**: ユーザーが存在しない場合も 200 を返却（セキュリティ配慮）。

### 2.4 パスワードリセット実行 (`POST /auth/reset-password`)
リセットトークンを検証し、新しいパスワードを設定します。

- **Request Body**:
  ```json
  {
    "token": "reset-token-string",
    "new_password": "newsecurepassword"
  }
  ```
- **Response (Success 200)**:
  ```json
  {
    "message": "パスワードが正常に変更されました。新しいパスワードでログインしてください。"
  }
  ```
- **Error**: 無効または期限切れのトークンは 400 Bad Request。

---

## 3. セキュリティ
- **パスワード保存**: `passlib` (Argon2) を使用してハッシュ化して保存。
- **認可**: `Authorization: Bearer <token>` ヘッダーを必須とする依存注入（Dependency Injection）を各エンドポイントに実装。
- **レート制限**: `slowapi` によるエンドポイント別レート制限
  - 登録: 5回/分
  - ログイン: 5回/分
  - パスワードリセットメール送信: 3回/時間
  - パスワードリセット実行: 5回/分

## 4. 補足: API ドキュメント
- `/docs` エンドポイントで Scalar によるインタラクティブな API ドキュメントを提供。
- OpenAPI スキーマには `BearerAuth` セキュリティ定義を含み、認証付きエンドポイントのテストが可能。

## 5. 実装フェーズ

### フェーズ 1: バックエンド基盤
1.  `core/security.py`: パスワードのハッシュ化・検証、JWTの生成・検証ロジック。
2.  `schemas/`: 登録・ログイン・パスワードリセット用の Pydantic モデル。
3.  `api/api_v1/endpoints/auth.py`: 認証用ルートの実装。
4.  `core/limiter.py`: レート制限の設定。

### フェーズ 2: フロントエンド実装
1.  `lib/api.ts`: ログイン・登録・パスワードリセット API の呼び出し関数。
2.  ログイン・サインアップ・パスワードリセット画面の作成。
3.  トークンの保存（localStorage + Cookie）と、APIリクエスト時の自動付与。
