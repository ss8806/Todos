# 02. 開発環境構築

この章では、Todoアプリの開発に必要なツールをインストールし、環境を整えます。

## 必要なツール一覧

| ツール | 用途 | インストール方法 |
|:---|:---|:---|
| Docker Desktop | PostgreSQLコンテナ実行 | 公式サイトからDMGインストール |
| uv | Pythonパッケージ管理 | `curl` または `brew` |
| Bun | JavaScriptランタイム | `curl` または `brew` |
| just | タスクランナー | `brew` または `cargo` |

## 1. Docker Desktop のインストール

PostgreSQLデータベースとメールサーバー（Mailpit）をDockerコンテナで実行するため、Docker Desktopが必要です。

### macOS の場合

```bash
# Homebrewでインストール
brew install --cask docker
```

または [Docker公式サイト](https://www.docker.com/products/docker-desktop/) からDMGをダウンロードしてインストールしてください。

インストール後、Docker Desktop を起動し、以下のコマンドで動作を確認します：

```bash
docker --version
docker compose version
```

## 2. uv のインストール

uv は Rust で書かれた高速な Python パッケージマネージャーです。

```bash
# macOS / Linux
curl -LsSf https://astral.sh/uv/install.sh | sh

# または Homebrew
brew install uv
```

インストール後、シェルを再起動するか、`source ~/.zshrc` を実行してパスを通します。

確認：

```bash
uv --version
```

## 3. Bun のインストール

Bun は高速な JavaScript ランタイムで、Next.js の開発サーバー実行や npm パッケージのインストールに使用します。

```bash
# macOS / Linux
curl -fsSL https://bun.sh/install | bash

# または Homebrew
brew install bun
```

確認：

```bash
bun --version
```

## 4. just のインストール

just は Makefile の代替となるシンプルなコマンドランナーです。

```bash
# Homebrew
brew install just

# または cargo
 cargo install just
```

確認：

```bash
just --version
```

## 5. 環境変数ファイルの作成

プロジェクトルートに `.env` ファイルを作成します：

```bash
cp .env.example .env
```

`.env` の内容例：

```env
# 実行環境
ENVIRONMENT=development

# データベース（Docker Compose の設定と一致させる）
POSTGRES_USER=postgres
POSTGRES_PASSWORD=password
POSTGRES_DB=tododb

# JWT用の秘密鍵（本番環境では必ず強力なランダム文字列に変更）
SECRET_KEY=your-super-secret-key-change-in-production

# フロントエンドURL
FRONTEND_URL=http://localhost:3000
```

`SECRET_KEY` は JWT の署名に使用するため、**本番環境では必ず強力なランダム文字列に変更**してください。開発環境では任意の文字列で構いません。

## 6. Dockerサービスの起動確認

ツールのインストールが完了したら、PostgreSQL と Mailpit が正常に起動するか確認します。

```bash
# プロジェクトルートで実行
just up
```

`just up` は `docker compose up -d` と同等で、バックグラウンドでコンテナを起動します。

起動したコンテナの確認：

```bash
docker compose ps
```

以下のサービスが起動していることを確認してください：

- `db` (PostgreSQL 16)
- `mailpit` (メールキャッチサーバー)

## 7. 各種ポートの確認

開発中に使用するポートは以下の通りです：

| サービス | ポート | 用途 |
|:---|:---|:---|
| Next.js (フロントエンド) | 3000 | ブラウザからアクセス |
| FastAPI (バックエンド) | 8000 | APIサーバー |
| PostgreSQL | 5432 | データベース |
| Mailpit (Web UI) | 8025 | 開発用メール確認 |
| Mailpit (SMTP) | 1025 | メール送信サーバー |

## トラブルシューティング

### ポートが既に使用されている場合

```bash
# ポート5432が使用中か確認
lsof -i :5432

# プロセスを終了する場合
kill -9 <PID>
```

### Dockerコンテナが起動しない場合

```bash
# ログを確認
docker compose logs db

# ボリュームを削除して初期化（データベースのデータが消えます）
just clean-db
```

### uv のコマンドが見つからない場合

```bash
# 手動でパスを通す
echo 'export PATH="$HOME/.cargo/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

## 次のステップ

環境構築が完了したら、[03章: プロジェクト初期化](03-project-init.md) でプロジェクトの骨組みを作成します。
