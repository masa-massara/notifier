# 詳細セットアップ手順

このドキュメントでは、Notifier アプリを開発環境でセットアップし、実行するための詳細な手順を説明します。

## 1. 前提条件

開発を開始する前に、以下のソフトウェアがローカルマシンにインストールされていることを確認してください。

-   **Docker Engine**: コンテナを実行するためのコアエンジン。
    -   [Docker 公式サイト](https://www.docker.com/products/docker-desktop/) からご自身の OS に合った Docker Desktop をインストールしてください。
-   **Docker Compose**: 複数のコンテナで構成されるアプリケーションを定義・実行するためのツール。
    -   Docker Desktop には通常、Docker Compose が含まれています。
-   **VSCode (Visual Studio Code)**: 推奨エディタ。
-   **VSCode Dev Containers 拡張機能**: VSCodeで開発コンテナを利用するために必要です。

## 2. プロジェクトの取得

まだプロジェクトのソースコードを取得していない場合は、Git を使用してリポジトリをクローンしてください。

```bash
git clone <リポジトリの URL>
cd notifier
```

## 3. 外部サービスと認証情報の設定

Notifier アプリは、動作するためにいくつかの外部サービスとの連携が必要です。それぞれの設定と、必要な認証情報の準備を行ってください。

### 3.1. Notion インテグレーション

(既存の内容のまま)
### 3.2. Google Cloud Firestore

(既存の内容のまま。サービスアカウントキーの作成と配置はFirebase Admin SDKの初期化に必要)
### 3.3. Firebase Authentication

ユーザー認証機能のために、Firebase Authentication を設定します。

1.  **Firebase プロジェクトへのアクセス**:
    -   Notifierアプリで使用しているGoogle Cloud プロジェクトが、Firebaseプロジェクトとしても連携されていることを確認します。（通常、Google CloudプロジェクトをFirebaseに追加することで連携できます。）
    -   [Firebase Console](https://console.firebase.google.com/) を開き、対象のプロジェクトを選択します。
2.  **Authentication の有効化**:
    -   左側のナビゲーションメニューから「構築」>「Authentication」を選択します。
    -   「始める」ボタンをクリックします。
    -   「ログイン方法」タブで、「メール/パスワード」プロバイダを選択し、「有効にする」トグルをオンにして保存します。

### 3.4. Firebase CLI のセットアップ (Dev Container 内)

Firebase Emulator Suite を利用するために、Dev Container 内に Firebase CLI をインストールし、ログインします。

1.  **Dev Container への Firebase CLI インストール**:
    -   Notifier プロジェクトを VSCode で開き、Dev Container に接続します。
    -   Dev Container のターミナルで、Firebase CLI がインストールされていない場合はインストールします。
        -   `devcontainer.json` の `features` に Node.js (`ghcr.io/devcontainers/features/node:1`) が設定されていることを確認し、コンテナをリビルド後、以下のコマンドでインストールするのが推奨です（rosetta errorを避けるため）。
            ```bash
            npm install -g firebase-tools
            ```
        -   インストール後、`firebase --version` でバージョンが表示されることを確認します。
2.  **Firebase へのログイン**:
    -   Dev Container のターミナルで `firebase login` を実行します。
    -   表示される認証URLをホストマシンのブラウザで開き、ログインを完了させます。
    -   ブラウザに表示された認証コードをターミナルに貼り付けます。

### 3.5. 環境変数ファイル (`.env`) の作成 (既存の内容をベースに、エミュレータ関連の記述について触れる)

プロジェクトのルートディレクトリに `.env` という名前のファイルを作成し、以下の情報を記述します。

```env
# .env ファイルの例

# (DEPRECATED - See note below) NOTION_INTEGRATION_TOKEN="secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
ENCRYPTION_KEY="your_64_character_hex_encryption_key_for_aes_256_gcm" # ★★★ NEW ★★★

# GOOGLE_APPLICATION_CREDENTIALS は docker-compose.yml で直接設定するため、ここには不要です。
# FIREBASE_AUTH_EMULATOR_HOST や FIRESTORE_EMULATOR_HOST も、
# 開発環境では docker-compose.yml で設定するため、通常 .env には記述不要です。

# PORT=3000 # 必要に応じてアプリケーションのポート番号を指定 (デフォルトは 3000)
```

-   `NOTION_INTEGRATION_TOKEN`: (非推奨) 以前はグローバルなNotionインテグレーションTOKENとして使用されていましたが、現在はユーザーごとのNotionインテグレーション機能に移行したため、このグローバルTOKENは通常不要になります。詳細は「Global `NOTION_INTEGRATION_TOKEN` Environment Variable」セクションを参照してください。
-   `ENCRYPTION_KEY`: ★★★ 新規追加 ★★★ ユーザーのNotionインテグレーションTOKENを暗号化・復号化するために使用されるAES-256-GCM用のキーです。**必ず64文字の16進数文字列（32バイトのキーに相当）を設定してください。** このキーはセキュリティ上非常に重要ですので、安全に管理してください。キーの生成には、OpenSSLなどのツールを使用できます（例: `openssl rand -hex 32`）。
-   **注意**: `.env` ファイルは `.gitignore` に追加し、Git リポジトリにコミットしないでください。

### 3.6. ユーザーごとのNotionインテグレーションの登録 (Notifierアプリへの登録)

Notifierアプリで通知テンプレートを作成・利用するには、まずユーザー自身のNotionインテグレーション情報をアプリに登録する必要があります。

1.  **Notion で内部インテグレーションを作成**:
    -   Notionのワークスペースで、新しい内部インテグレーションを作成します。
    -   詳細な手順は、Notionの公式ガイドを参照してください: [Create integrations with the Notion API](https://www.notion.so/help/create-integrations-with-the-notion-api)
    -   インテグレーションの「Capabilities」(機能)設定では、少なくとも「Read content」(コンテンツの読み取り)権限が必要です。将来的に他の機能を利用する場合は、追加の権限が必要になることがあります。
2.  **内部インテグレーションTOKENの取得**:
    -   作成したインテグレーションの設定ページで、「Secrets」セクションにある「Internal Integration Token」をコピーします。このTOKENは `secret_` で始まります。 **このTOKENは他人に公開しないでください。**
3.  **対象データベースをインテレーションと共有**:
    -   Notifierアプリで通知を設定したいNotionデータベースを開きます。
    -   右上の「•••」(メニュー) > 「Add connections」(コネクト追加) (または「接続先を追加」) を選択し、ステップ1で作成した自身のインテグレーションを検索して選択します。
    -   これにより、あなたのインテグレーションがそのデータベースにアクセスできるようになります。
4.  **Notifier アプリへの登録**:
    -   取得した「Internal Integration Token」をNotifierアプリに登録します。これには、`POST /api/v1/me/notion-integrations` エンドポイントを使用します。
    -   リクエスト例 (cURLを使用):
        ```bash
        curl -X POST http://localhost:3000/api/v1/me/notion-integrations \
         -H "Content-Type: application/json" \
         -H "Authorization: Bearer YOUR_FIREBASE_ID_TOKEN" \
         -d '{
           "integrationName": "My Personal Notion Workspace",
           "notionIntegrationToken": "secret_YOUR_INTERNAL_INTEGRATION_TOKEN_HERE"
         }'
        ```
    -   `YOUR_FIREBASE_ID_TOKEN` は、Firebase Authentication で取得した有効なIDトークンに置き換えてください。
    -   `integrationName` には、この連携を識別するための任意の名前を指定します。
    -   成功すると、登録された連携のIDなどが返されます (TOKEN自体は返されません)。このID (`userNotionIntegrationId`) は、通知テンプレートを作成する際に必要になります。
5.  **登録した連携の利用**:
    -   通知テンプレートを作成 (<code>POST /api/v1/templates</code>) する際、リクエストボディに `userNotionIntegrationId`として、上記ステップ4で返却された連携IDを指定します。これにより、テンプレートはそのNotion連携を使用してデータベースにアクセスします。

## 4. アプリケーションの起動 と Firebase Emulator Suite の利用 (開発環境)

上記の設定が完了したら、アプリケーションと Firebase Emulator Suite を起動できます。

### 4.1. Firebase Emulator Suite のセットアップと起動 (Dev Container 内)

開発時には、Firebase Authentication や Firestore の動作をローカルでエミュレートするために Firebase Emulator Suite を使用します。

1.  **エミュレータの初期化**:
    -   Dev Container のターミナルで、プロジェクトのルートディレクトリ (`/usr/src/app`) にて以下を実行します。
        ```bash
        firebase init emulators
        ```
    -   プロンプトに従い、使用するエミュレータとして「Authentication Emulator」と「Firestore Emulator」を選択し、それぞれのポート（例: Auth: 9099, Firestore: 8080）、および Emulator UI のポート（例: 4000）を設定します。
2.  **`firebase.json` の確認**:
    -   プロジェクトルートに生成/更新された `firebase.json` に、以下のようなエミュレータ設定が記述されていることを確認します。
        ```json
        {
          "emulators": {
            "auth": { "port": 9099 },
            "firestore": { "port": 8080 },
            "ui": { "enabled": true, "port": 4000 },
            "singleProjectMode": true
          }
        }
        ```
3.  **Dev Container のポートフォワーディング**:
    -   `.devcontainer/devcontainer.json` の `forwardPorts` 配列に、Notifierアプリのポート(`3000`)に加えて、Emulator UI (`4000`)、Auth Emulator (`9099`)、Firestore Emulator (`8080`) のポートを追加します。
        ```json
        // .devcontainer/devcontainer.json の例
        {
          // ...
          "forwardPorts": [3000, 4000, 9099, 8080],
          // ...
        }
        ```
    -   このファイルを変更した場合、VSCode のコマンドパレットから「Dev Containers: Rebuild Container」を実行してコンテナを再構築します。
4.  **Admin SDK のエミュレータ接続設定**:
    -   `docker-compose.yml` の `app` サービスの `environment` セクションに、Admin SDKがローカルエミュレータに接続するための環境変数を設定します。
        ```yaml
        # docker-compose.yml の app: services: environment:
        environment:
          - GOOGLE_APPLICATION_CREDENTIALS=/usr/src/app/service-account-key.json
          - NODE_ENV=development
          - FIREBASE_AUTH_EMULATOR_HOST=localhost:9099
          - FIRESTORE_EMULATOR_HOST=localhost:8080
        ```
5.  **エミュレータの起動**:
    -   Dev Container のターミナルで、プロジェクトルートにて以下を実行します。
        ```bash
        firebase emulators:start
        ```
    -   「All emulators ready!」と表示されれば起動成功です。Emulator UI は `http://localhost:4000` でアクセスできます（ポートフォワーディング設定後）。
6.  **テストユーザーの作成**:
    -   ホストマシンのブラウザから Emulator UI (`http://localhost:4000`) にアクセスし、「Authentication」タブでテスト用のメールアドレスとパスワードでユーザーを作成します。
7.  **IDトークンの取得 (テスト用)**:
    -   テストユーザーでログインし、IDトークンを取得するためのクライアント（例: `notifier/scripts/getIdToken.mjs` などのNode.jsスクリプト、または簡単なHTML/JSページ）を準備・実行します。
    -   Node.jsスクリプトの場合、`firebaseConfig` を実際のプロジェクトの値に設定し、Dev Container内で実行してコンソールに出力されたIDトークンをコピーします。
        ```bash
        # 例: bun scripts/getIdToken.ts (または node scripts/getIdToken.mjs)
        ```
    - HTML/JSクライアントの場合、Dev Container内でHTTPサーバーを立てて（例: `emulator_test_client` フォルダで `npx serve -p 7000`）、フォワードされたポート（例: `http://localhost:7000`）にホストのブラウザからアクセスしてIDトークンを取得します。

### 4.2. アプリケーションの起動 (VSCode Dev Containers を使用)

1.  VSCode で `notifier` プロジェクトを開き、Dev Container に接続します。
    -   （`forwardPorts` の変更などでコンテナをリビルドした場合は、その完了を待ちます。）
2.  **Firebase Emulator Suite が起動していることを確認します (上記 4.1 の手順)。**
3.  VSCode 内のターミナルで、以下のコマンドを実行して開発サーバーを起動します。
    ```bash
    bun run dev
    ```
    `devcontainer.json` の `postCreateCommand` で `bun install` や Firebase CLIのインストールが設定されていれば、依存関係はコンテナビルド/作成時に自動で処理されます。

### 4.3. 直接 `docker-compose` を使用する場合 (既存の内容をベースに、エミュレータとの連携について触れる)

プロジェクトのルートディレクトリで、ターミナルから以下のコマンドを実行します。

```bash
docker-compose up --build
```

-   `--build` オプションは、初回起動時や `Dockerfile` に変更があった場合にイメージを再ビルドします。
-   この方法で起動した場合、`docker-compose.yml` の `command` が実行されます。
-   **注意**: この方法でアプリを起動する場合、Firebase Emulator Suite は別途 Dev Container 内またはホストマシンで `firebase emulators:start` コマンドを使って起動しておく必要があります。`docker-compose.yml` にエミュレータの起動は含まれていません。Admin SDKがエミュレータに接続するための環境変数は `docker-compose.yml` に設定済みです。

## 5. 動作確認

アプリケーションが正常に起動すると、ターミナルに「Notifier app is running on port 3000」などのログが表示されます。
Firebase Emulator Suite も起動していれば、`http://localhost:4000` で Emulator UI にアクセスできます。

取得したIDトークンを `Authorization: Bearer <ID_TOKEN>` ヘッダーに含めて、保護されたAPIエンドポイント（例: `GET http://localhost:3000/api/v1/templates`）にリクエストを送信し、動作を確認してください。詳細は [API エンドポイント仕様 (`docs/api_reference.md`)] を参照してください。
