# 認証機能 詳細仕様書 (Auth Specification)

本ドキュメントでは、Todoアプリにおけるユーザー認証（登録・ログイン）の詳細仕様を定義します。

## 1. 認証方式
- **方式**: JWT (JSON Web Token) によるステートレス認証
- **トークン保持**: フロントエンドの LocalStorage または Cookie（開発初期はLocalStorageを想定）
- **アルゴリズム**: HS256
- **有効期限**: 30分（設定可能）

## 2. API エンドポイント

### 2.1 ユーザー登録 (`POST /auth/register`)
ユーザーを新規作成します。

- **Request Body**:
  ```json
  {
    "username": "user123",
    "password": "securepassword"
  }
  ```
- **Response (Success 201)**:
  ```json
  {
    "id": "uuid",
    "username": "user123"
  }
  ```
- **Error**: ユーザー名が既に存在する場合は 400 Bad Request。

### 2.2 ログイン (`POST /auth/token`)
ユーザー認証を行い、アクセストークンを発行します。
※ FastAPI の標準的な OAuth2 パスワードフローに準拠し、`username` と `password` を form-data で受け取ります。

- **Request (form-data)**:
  - `username`: ユーザー名
  - `password`: パスワード
- **Response (Success 200)**:
  ```json
  {
    "access_token": "eyJhbG...",
    "token_type": "bearer"
  }
  ```
- **Error**: 認証失敗時は 401 Unauthorized。

---

## 3. セキュリティ
- **パスワード保存**: `passlib` (bcrypt) を使用してハッシュ化して保存。
- **認可**: `Authorization: Bearer <token>` ヘッダーを必須とする依存注入（Dependency Injection）を各エンドポイントに実装。

## 4. 実装フェーズ

### フェーズ 1: バックエンド基盤
1.  `auth_utils.py`: パスワードのハッシュ化・検証、JWTの生成・検証ロジック。
2.  `schemas.py`: 登録・ログイン用の Pydantic モデル。
3.  `main.py`: 認証用ルートの追加。

### フェーズ 2: フロントエンド実装
1.  `api_client.ts`: ログイン・登録 API の呼び出し関数。
2.  ログイン・サインアップ画面の作成。
3.  トークンの保存と、APIリクエスト時の自動付与。
