# 詳細セットアップ手順

このドキュメントでは、Notifier アプリを開発環境でセットアップし、実行するための詳細な手順を説明します。

## 1. 前提条件

開発を開始する前に、以下のソフトウェアがローカルマシンにインストールされていることを確認してください。

-   **Docker Engine**: コンテナを実行するためのコアエンジン。
    -   [Docker 公式サイト](https://www.docker.com/products/docker-desktop/) からご自身の OS に合った Docker Desktop をインストールしてください。
-   **Docker Compose**: 複数のコンテナで構成されるアプリケーションを定義・実行するためのツール。
    -   Docker Desktop には通常、Docker Compose が含まれています。

## 2. プロジェクトの取得

まだプロジェクトのソースコードを取得していない場合は、Git を使用してリポジトリをクローンしてください。

```bash
git clone <リポジトリの URL>
cd notifier
```

## 3. 外部サービスと認証情報の設定

Notifier アプリは、動作するためにいくつかの外部サービスとの連携が必要です。それぞれの設定と、必要な認証情報の準備を行ってください。

### 3.1. Notion インテグレーション

Notion API を利用してデータベースの情報を取得するために、Notion インテグレーションを作成し、インテグレーションシークレット（トークン）を取得する必要があります。

1.  **Notion でインテグレーションを作成**:
    -   Notion ワークスペースの「設定」メニューから「インテグレーション」を選択します。
    -   「新しいインテグレーションを作成する」をクリックします。
    -   インテグレーションに名前を付け（例: `Notifier App Dev Integration`）、関連付けるワークスペースを選択します。
    -   「機能」セクションで、少なくとも「コンテンツの読み取り権限」を付与してください。将来的には、より詳細な権限設定が必要になる場合があります。
    -   「送信」をクリックしてインテグレーションを作成します。
2.  **インテグレーションシークレットの取得**:
    -   作成されたインテグレーションの詳細ページで、「シークレット」セクションにある「**内部インテグレーションシークレット**」をコピーします。これは `secret_` で始まる長い文字列です。
    -   **このシークレットは機密情報です。安全な場所に保管し、Git リポジトリなどには絶対にコミットしないでください。**
3.  **対象データベースへのインテグレーション接続**:
    -   通知のトリガーとしたい Notion データベースを開きます。
    -   データベース右上の「•••」メニュー（または共有メニュー）から「接続の追加」を選択します。
    -   検索窓で、さきほど作成したインテグレーション名を入力し、表示されたインテグレーションを選択して接続を許可します。
    -   データベースの情報を読み取るために、インテグレーションに少なくとも「読み取り権限」を与えてください。

### 3.2. Google Cloud Firestore

テンプレート情報と送信先情報を永続化するために、Google Cloud Firestore を使用します。

1.  **Google Cloud プロジェクトの作成**:
    -   [Google Cloud Console](https://console.cloud.google.com/) で新しいプロジェクトを作成するか、既存のプロジェクトを使用します。
2.  **Firestore の有効化**:
    -   選択したプロジェクトで、ナビゲーションメニューから「データベース」>「Firestore」を選択します。
    -   「データベースを作成」をクリックします。
    -   「**ネイティブモード**」を選択します。
    -   **エディション**: 「Standard Edition」を選択します。
    -   **場所 (ロケーションタイプとリージョン)**: 「リージョン」を選択し、任意のリージョン（例: `asia-northeast1` (東京) または `asia-northeast2` (大阪)）を選択します。
    -   **セキュリティルール**: 初期設定として「**限定的**」（テストモードではない方）を選択します。
    -   「データベースを作成」をクリックして完了します。
3.  **サービスアカウントキーの作成と配置**:
    -   Google Cloud Console の「IAM と管理」>「サービスアカウント」ページに移動します。
    -   新しいサービスアカウントを作成するか、既存のサービスアカウントを使用します。
        -   新しいサービスアカウントを作成する場合、任意のサービスアカウント名（例: `notifier-firestore-accessor`）を設定します。
        -   作成したサービスアカウントに「**Cloud Datastore ユーザー**」ロール（Firestore の読み書き権限が含まれます）を割り当てます。
    -   該当のサービスアカウントの詳細画面から「キー」タブを選択し、「キーを追加」>「新しいキーを作成」を選びます。
    -   キーのタイプとして「**JSON**」を選択し、「作成」をクリックすると、キーファイルがダウンロードされます。
    -   ダウンロードした JSON キーファイルを、プロジェクトのルートディレクトリに `.gcloud` という名前のフォルダを作成し、その中に `service-account-key.json` という名前で保存します (パス: `notifier/.gcloud/service-account-key.json`)。
    -   **この JSON キーファイルおよび `.gcloud` フォルダは、必ず `.gitignore` に追加し、Git リポジトリにコミットしないでください。**

### 3.3. 環境変数ファイル (`.env`) の作成

プロジェクトのルートディレクトリに `.env` という名前のファイルを作成し、以下の情報を記述します。

```env

# .env ファイルの例

NOTION_INTEGRATION_TOKEN="secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

# GOOGLE_APPLICATION_CREDENTIALS は docker-compose.yml で直接設定するため、ここには不要です。

# PORT=3000 # 必要に応じてアプリケーションのポート番号を指定 (デフォルトは 3000)

```

-   `NOTION_INTEGRATION_TOKEN`: 手順 3.1 で取得した Notion の内部インテグレーションシークレットをここに貼り付けてください。
-   **注意**: `.env` ファイルは `.gitignore` に追加し、Git リポジトリにコミットしないでください。

## 4. アプリケーションの起動 (開発環境)

上記の設定が完了したら、アプリケーションを起動できます。

### 4.1. VSCode Dev Containers を使用する場合 (推奨)

1.  VSCode で `notifier` プロジェクトを開きます。
2.  「Dev Containers」拡張機能がインストールされていることを確認してください。
3.  VSCode のコマンドパレット (macOS: `Cmd+Shift+P`, Windows/Linux: `Ctrl+Shift+P`) を開きます。
4.  「**Dev Containers: Rebuild and Reopen in Container**」または「**Dev Containers: Reopen in Container**」を選択します。
    -   初回起動時や設定ファイル（`.devcontainer/devcontainer.json`, `docker-compose.yml` など）を変更した場合は、「Rebuild and Reopen in Container」を選択してコンテナを再構築することを推奨します。
5.  コンテナがビルドされ、VSCode がコンテナに接続されると、VSCode 内のターミナルが自動的に開くか、手動で開くことができます。
6.  VSCode 内のターミナルで、以下のコマンドを実行して開発サーバーを起動します。
    ```bash
    bun run dev
    ```
    `devcontainer.json` の `postCreateCommand` で `bun install` が設定されていれば、依存関係はコンテナビルド時に自動でインストールされます。

### 4.2. 直接 `docker-compose` を使用する場合

プロジェクトのルートディレクトリで、ターミナルから以下のコマンドを実行します。

```bash
docker-compose up --build
```

-   `--build` オプションは、初回起動時や `Dockerfile` に変更があった場合にイメージを再ビルドします。普段の起動は `docker-compose up` だけで十分です。
-   この方法で起動した場合、`docker-compose.yml` の `command: sh -c "bun install && bun run dev"` が実行され、依存関係のインストールと開発サーバーの起動が自動的に行われます。

## 5. 動作確認

アプリケーションが正常に起動すると、ターミナルに以下のようなログが表示されます。

```
Notifier app is running on port 3000
Persistence: Firestore (または InMemory)
Started development server: http://localhost:3000
```

ブラウザで `http://localhost:3000/` (または `.env` で設定した `PORT`) にアクセスし、「Notifier App is running!」と表示されれば、アプリケーションの基本的な起動は成功です。

API エンドポイントのテストや Webhook の受信テストは、[API エンドポイント仕様 (`docs/api_reference.md`)] や [Webhook 処理フロー解説 (`docs/webhook_processing_flow.md`)] を参照して行ってください。
