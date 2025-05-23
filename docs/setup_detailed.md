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

### 3.4. User-Specific Notion Integrations (ユーザー固有のNotionインテグレーション)

このアプリケーションでは、ユーザーが自身のNotion Internal Integration Tokenを登録し、それを利用してNotionデータベースへのアクセスを行います。これにより、各ユーザーは自身の権限範囲内でアプリケーションを利用できます。

**Notion Internal Integrationの作成方法:**

1.  Notionの `My integrations` ページ (https://www.notion.so/my-integrations) にアクセスします。
2.  `+ New integration` ボタンをクリックします。
3.  インテグレーションに名前を付け（例: "My Notifier App Integration"）、関連付けるワークスペースを選択します。
4.  Capabilitiesとして "Internal Integration" を選択します（これにより、APIキーが発行されます）。
5.  **重要**: 作成したインテグレーションを、Notifierアプリで使用したい特定のデータベースと共有する必要があります。これはNotionのUIから行います。データベースの右上にある「共有」(Share)メニューを開き、「招待」(Invite)タブで作成したインテグレーションを選択して追加します。少なくとも「読み取り権限」(Can view) が必要です。テンプレート作成時のスキーマ検証やWebhook処理時のデータ取得のため、「コンテンツの読み取り」(Read content)権限も確認してください。
6.  インテグレーションを作成すると、「Internal Integration Token」が提供されます（例: `secret_xxxxxxxxxxxxxxxxxxxx`）。このトークンをコピーします。これがNotifierアプリに登録するトークンです。

**Notifierアプリへのトークン登録:**

ユーザーは、Notifierアプリが提供する新しいAPIエンドポイント（詳細は `docs/api_reference.md` の `/api/v1/me/notion-integrations` セクションを参照）を使用して、上記で取得したInternal Integration Tokenを登録・管理します。

**テンプレート作成時の利用:**

テンプレートを作成する際には、リクエストボディに、登録済みの `UserNotionIntegration` のIDを `userNotionIntegrationId` として指定する必要があります。これにより、そのテンプレートに関連するNotion APIコールが、指定されたユーザーのトークンを使用して行われます。

### 3.5. Firebase CLI のセットアップ (Dev Container 内)

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

NOTION_INTEGRATION_TOKEN="secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
NOTION_TOKEN_ENCRYPTION_KEY="your_32_byte_hex_secret_key_here"

# GOOGLE_APPLICATION_CREDENTIALS は docker-compose.yml で直接設定するため、ここには不要です。
# FIREBASE_AUTH_EMULATOR_HOST や FIRESTORE_EMULATOR_HOST も、
# 開発環境では docker-compose.yml で設定するため、通常 .env には記述不要です。

# PORT=3000 # 必要に応じてアプリケーションのポート番号を指定 (デフォルトは 3000)
```

-   `NOTION_INTEGRATION_TOKEN`: 以前は全てのNotion APIインタラクションのグローバルトークンとして使用されていました。ユーザー固有のインテグレーション導入に伴い、このトークンはユーザーがトリガーするアクションでは段階的に廃止されるか、もしあればシステムレベル/管理者機能のために保持される可能性があります。ユーザー固有のデータアクセスには、システムはユーザーが提供したトークンに依存します。
-   `NOTION_TOKEN_ENCRYPTION_KEY`: ユーザーのNotionインテグレーションアクセストークンを暗号化および復号化するために使用される32バイト（256ビット）の秘密鍵です。このキーは極秘に保管する必要があります。適切なキーは `openssl rand -hex 32` のようなコマンドで生成できます。
-   **注意**: `.env` ファイルは `.gitignore` に追加し、Git リポジトリにコミットしないでください。

## 5. アプリケーションの起動 と Firebase Emulator Suite の利用 (開発環境)

上記の設定が完了したら、アプリケーションと Firebase Emulator Suite を起動できます。

### 5.1. Firebase Emulator Suite のセットアップと起動 (Dev Container 内)

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

### 5.2. アプリケーションの起動 (VSCode Dev Containers を使用)

1.  VSCode で `notifier` プロジェクトを開き、Dev Container に接続します。
    -   （`forwardPorts` の変更などでコンテナをリビルドした場合は、その完了を待ちます。）
2.  **Firebase Emulator Suite が起動していることを確認します (上記 5.1 の手順)。**
3.  VSCode 内のターミナルで、以下のコマンドを実行して開発サーバーを起動します。
    ```bash
    bun run dev
    ```
    `devcontainer.json` の `postCreateCommand` で `bun install` や Firebase CLIのインストールが設定されていれば、依存関係はコンテナビルド/作成時に自動で処理されます。

### 5.3. 直接 `docker-compose` を使用する場合 (既存の内容をベースに、エミュレータとの連携について触れる)

プロジェクトのルートディレクトリで、ターミナルから以下のコマンドを実行します。

```bash
docker-compose up --build
```

-   `--build` オプションは、初回起動時や `Dockerfile` に変更があった場合にイメージを再ビルドします。
-   この方法で起動した場合、`docker-compose.yml` の `command` が実行されます。
-   **注意**: この方法でアプリを起動する場合、Firebase Emulator Suite は別途 Dev Container 内またはホストマシンで `firebase emulators:start` コマンドを使って起動しておく必要があります。`docker-compose.yml` にエミュレータの起動は含まれていません。Admin SDKがエミュレータに接続するための環境変数は `docker-compose.yml` に設定済みです。

## 6. 動作確認

アプリケーションが正常に起動すると、ターミナルに「Notifier app is running on port 3000」などのログが表示されます。
Firebase Emulator Suite も起動していれば、`http://localhost:4000` で Emulator UI にアクセスできます。

取得したIDトークンを `Authorization: Bearer <ID_TOKEN>` ヘッダーに含めて、保護されたAPIエンドポイント（例: `GET http://localhost:3000/api/v1/templates`）にリクエストを送信し、動作を確認してください。詳細は [API エンドポイント仕様 (`docs/api_reference.md`)] を参照してください。
