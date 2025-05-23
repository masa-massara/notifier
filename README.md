# Notifier App - Notion 連携チャット通知アプリ

Notifier App は、Notion データベース内のページの変更をトリガーとして、事前に設定された条件に基づいて、カスタマイズされたメッセージを外部のチャットツール（Discord, Microsoft Teams など、Webhook に対応したサービス）にリアルタイムで通知する中継アプリケーションです。

## 主な機能

-   Notion データベースの変更（ページの新規作成、プロパティ更新など）をトリガーに通知
-   ユーザーが定義可能な通知テンプレート（条件、メッセージ本文、送信先を指定）
-   複数のチャットサービスへの対応 (汎用的な Webhook URL を利用)
-   Notion データベースのスキーマ情報を利用した、柔軟な条件設定とメッセージ整形
-   データベーススキーマ情報のキャッシュによるパフォーマンス向上

## 技術スタック

-   **バックエンド**: Bun, Hono, TypeScript
-   **データベース**: Google Cloud Firestore
-   **キャッシュ**: インメモリキャッシュ (将来的には Redis 等も検討)
-   **外部連携**: Notion API, 各チャットツールの Webhook
-   **開発環境**: Docker, VSCode Dev Containers

## セットアップと実行方法 (開発環境)

### 必要なもの

-   Docker Engine
-   Docker Compose

### 環境設定

1.  **`.env` ファイルの作成**:
    プロジェクトのルートディレクトリに `.env` という名前のファイルを作成し、以下の内容を記述してください。実際の値は各サービスから取得してください。

    ```env
    NOTION_INTEGRATION_TOKEN="your_notion_integration_secret_here"
    # GOOGLE_APPLICATION_CREDENTIALS は docker-compose.yml 経由で設定されます
    # PORT=3000 # 必要であれば指定 (デフォルト3000)
    ```

    **注意**: `.env` ファイルは `.gitignore` に追加し、Git リポジトリにコミットしないでください。

2.  **Google Cloud サービスアカウントキーの配置**:

    -   Google Cloud Platform (GCP) でプロジェクトを作成し、Firestore を有効化してください。
    -   IAM と管理からサービスアカウントを作成し、「Cloud Datastore ユーザー」ロールを割り当てます。
    -   そのサービスアカウントのキー（JSON 形式）をダウンロードします。
    -   プロジェクトのルートディレクトリに `.gcloud` というフォルダを作成し、ダウンロードした JSON キーファイルを `service-account-key.json` という名前でその中 (`.gcloud/service-account-key.json`) に配置してください。
    -   **注意**: `.gcloud` フォルダおよびキーファイルも `.gitignore` に追加し、Git リポジトリにコミットしないでください。

3.  **Notion インテグレーションの設定**:
    -   Notion で新しいインテグレーションを作成し、「内部インテグレーションシークレット」（これが`NOTION_INTEGRATION_TOKEN`になります）を取得してください。
    -   通知の対象としたい Notion データベースの「接続」設定で、作成したインテグレーションを追加し、必要な権限（最低でも読み取り権限）を与えてください。

### アプリケーションの起動

1.  **VSCode Dev Containers を使用する場合 (推奨)**:
    -   VSCode でプロジェクトを開きます。
    -   「Dev Containers」拡張機能がインストールされていることを確認してください。
    -   コマンドパレット (Cmd/Ctrl + Shift + P) から「Dev Containers: Rebuild and Reopen in Container」または「Dev Containers: Reopen in Container」を選択します。
    -   コンテナが起動し、VSCode がコンテナに接続されたら、VSCode 内のターミナルを開き、以下のコマンドを実行します。
        ```bash
        bun run dev
        ```
2.  **直接 `docker-compose` を使用する場合**:
    プロジェクトのルートディレクトリで以下のコマンドを実行します。
    ```bash
    docker-compose up --build
    ```

### 動作確認

-   ブラウザで `http://localhost:3000/` (または `.env` で設定した `PORT`) にアクセスし、「Notifier App is running!」と表示されれば起動成功です。
-   API エンドポイントの詳細は `docs/api_reference.md` を参照してください。

## 詳細ドキュメント

より詳細なアプリケーションの仕様、アーキテクチャ、API リファレンス、設定手順については、`docs` フォルダ内の各ドキュメントを参照してください。

-   [`docs/index.md`](./docs/index.md) - はじめに (このアプリでできること)
-   [`docs/architecture.md`](./docs/architecture.md) - アプリケーションアーキテクチャ
-   [`docs/setup_detailed.md`](./docs/setup_detailed.md) - 詳細セットアップ手順
-   [`docs/api_reference.md`](./docs/api_reference.md) - API エンドポイント仕様
-   [`docs/webhook_processing_flow.md`](./docs/webhook_processing_flow.md) - Webhook 処理フロー解説
-   [`docs/template_placeholders.md`](./docs/template_placeholders.md) - 通知テンプレートのプレースホルダ仕様
