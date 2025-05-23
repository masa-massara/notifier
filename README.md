# Notifier App - Notion 連携チャット通知アプリ

Notifier App は、Notion データベース内のページの変更をトリガーとして、事前に設定された条件に基づいて、カスタマイズされたメッセージを外部のチャットツール（Discord, Microsoft Teams など、Webhook に対応したサービス）にリアルタイムで通知する中継アプリケーションです。

## 主な機能

-   Notion データベースの変更（ページの新規作成、プロパティ更新など）をトリガーに通知
-   **ユーザー認証機能**: Firebase Authentication を利用してAPIエンドポイントを保護し、ユーザーごとのリソース管理を実現。
-   **ユーザーごとのリソース管理**: 通知テンプレートや送信先情報をユーザー単位で作成・管理可能。
-   ユーザーが定義可能な通知テンプレート（条件、メッセージ本文、送信先を指定）
-   複数のチャットサービスへの対応 (汎用的な Webhook URL を利用)
-   Notion データベースのスキーマ情報を利用した、柔軟な条件設定とメッセージ整形
-   データベーススキーマ情報のキャッシュによるパフォーマンス向上

## 技術スタック

-   **バックエンド**: Bun, Hono, TypeScript
-   **データベース**: Google Cloud Firestore
-   **認証**: Firebase Authentication
-   **キャッシュ**: インメモリキャッシュ (将来的には Redis 等も検討)
-   **外部連携**: Notion API, 各チャットツールの Webhook
-   **開発環境**: Docker, VSCode Dev Containers, Firebase Emulator Suite

## セットアップと実行方法 (開発環境)

### 必要なもの

-   Docker Engine
-   Docker Compose
-   VSCode と Dev Containers 拡張機能 (推奨)
-   Firebase CLI (Dev Container内で利用)

### 環境設定

1.  **`.env` ファイルの作成**:
    プロジェクトのルートディレクトリに `.env` という名前のファイルを作成し、以下の内容を記述してください。実際の値は各サービスから取得してください。

    ```env
    # NOTION_INTEGRATION_TOKEN="your_notion_integration_secret_here" # (DEPRECATED - See below)
    ENCRYPTION_KEY="your_64_character_hex_encryption_key_for_aes_256_gcm" # ★★★ NEW ★★★

    # GOOGLE_APPLICATION_CREDENTIALS は docker-compose.yml 経由で設定されます
    # PORT=3000 # 必要であれば指定 (デフォルト3000)
    # FIREBASE_AUTH_EMULATOR_HOST, FIRESTORE_EMULATOR_HOST も docker-compose.yml で設定します
    ```

    -   `NOTION_INTEGRATION_TOKEN`: (非推奨) 以前はグローバルなNotionインテグレーションTOKENとして使用されていましたが、現在はユーザーごとのNotionインテグレーション機能 (`/api/v1/me/notion-integrations`) の導入により、このグローバルTOKENはAPIの主要機能では使用されなくなりました。特定のスタンドアロンプロセスや将来的な管理機能のために残す可能性もありますが、通常のユーザー操作では不要です。詳細は `docs/setup_detailed.md` を参照してください。
    -   `ENCRYPTION_KEY`: ★★★ 新規追加 ★★★ ユーザーのNotionインテグレーションTOKENを暗号化・復号化するために必須のキーです。**必ず64文字の16進数文字列（32バイトのキーに相当）を設定してください。** キーの生成例: `openssl rand -hex 32`。
    -   **注意**: `.env` ファイルは `.gitignore` に追加し、Git リポジトリにコミットしないでください。

2.  **Google Cloud サービスアカウントキーの配置**:
    -   Google Cloud Platform (GCP) でプロジェクトを作成し、Firestore を有効化してください。
    -   IAM と管理からサービスアカウントを作成し、「Cloud Datastore ユーザー」ロールを割り当てます。
    -   そのサービスアカウントのキー（JSON 形式）をダウンロードします。
    -   プロジェクトのルートディレクトリに `.gcloud` というフォルダを作成し、ダウンロードした JSON キーファイルを `service-account-key.json` という名前でその中 (`.gcloud/service-account-key.json`) に配置してください。
    -   **注意**: `.gcloud` フォルダおよびキーファイルも `.gitignore` に追加し、Git リポジトリにコミットしないでください。

3.  **Notion インテグレーションの設定 (ユーザーごと)**:
    -   このアプリケーションは、ユーザーが自身のNotionインテグレーションTOKENを登録して使用する形になりました。ユーザーは自身でNotionインテグレーションを作成し、そのTOKENを本アプリケーションのAPI経由で登録します。
    -   通知の対象としたい Notion データベースの「接続」設定で、ユーザーが自身のインテグレーションを追加し、必要な権限（最低でも読み取り権限）を与える必要があります。

4.  **Firebase Authentication と Emulator Suite の設定**:
    -   Firebase プロジェクトで Authentication を有効化し、「メール/パスワード」サインイン方法を有効にしてください。
    -   開発時には Firebase Emulator Suite を利用して認証と Firestore をエミュレートします。Dev Container 内で `firebase init emulators` を実行し、Auth Emulator (例: port `9099`)、Firestore Emulator (例: port `8080`)、Emulator UI (例: port `4000`) を設定してください。
    -   詳細は `docs/setup_detailed.md` を参照してください。

### アプリケーションの起動

1.  **VSCode Dev Containers を使用する場合 (推奨)**:
    -   VSCode でプロジェクトを開き、「Dev Containers: Rebuild and Reopen in Container」または「Dev Containers: Reopen in Container」を選択します。
    -   コンテナが起動し、VSCode がコンテナに接続されたら、VSCode 内のターミナルを開きます。
    -   **Firebase Emulator Suite の起動**: 別のターミナル（または同じターミナルの別タブ/ペイン）で、プロジェクトルートにて以下を実行します。
        ```bash
        firebase emulators:start
        ```
    -   **開発サーバーの起動**: メインのターミナルで以下を実行します。
        ```bash
        bun run dev
        ```
2.  **直接 `docker-compose` を使用する場合**:
    プロジェクトのルートディレクトリで以下のコマンドを実行します。
    ```bash
    docker-compose up --build
    ```
    -   **注意**: この方法でアプリを起動する場合、Firebase Emulator Suite は別途 Dev Container 内またはホストマシンで `firebase emulators:start` コマンドを使って起動しておく必要があります。

### 動作確認

-   ブラウザで `http://localhost:3000/` (または `.env` で設定した `PORT`) にアクセスし、「Notifier App is running!」と表示されれば起動成功です。
-   Firebase Emulator UI (`http://localhost:4000` など) にアクセスして、エミュレータの動作状況を確認できます。
-   APIエンドポイントをテストする際は、認証が必要なエンドポイントにはFirebase IDトークンを `Authorization: Bearer <ID_TOKEN>` ヘッダーに含めてリクエストしてください。IDトークンの取得方法については `docs/setup_detailed.md` を参照してください。
-   API エンドポイントの詳細は `docs/api_reference.md` を参照してください。

## 詳細ドキュメント

より詳細なアプリケーションの仕様、アーキテクチャ、API リファレンス、設定手順については、`docs` フォルダ内の各ドキュメントを参照してください。

-   [`docs/index.md`](./docs/index.md) - はじめに (このアプリでできること)
-   [`docs/architecture.md`](./docs/architecture.md) - アプリケーションアーキテクチャ
-   [`docs/setup_detailed.md`](./docs/setup_detailed.md) - 詳細セットアップ手順
-   [`docs/api_reference.md`](./docs/api_reference.md) - API エンドポイント仕様
-   [`docs/webhook_processing_flow.md`](./docs/webhook_processing_flow.md) - Webhook 処理フロー解説
-   [`docs/template_placeholders.md`](./docs/template_placeholders.md) - 通知テンプレートのプレースホルダ仕様
