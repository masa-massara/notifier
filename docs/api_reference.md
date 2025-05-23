# API エンドポイント仕様

このドキュメントでは、Notifier アプリが提供する API エンドポイントの詳細な仕様について説明します。

ベース URL: `http://localhost:3000` (開発環境の場合。デプロイ環境では異なります)

## 1. Templates (通知テンプレート管理)

通知メッセージのテンプレートを作成、取得、更新、削除するためのエンドポイントです。

### 1.1. テンプレートの作成

-   **エンドポイント**: `POST /api/v1/templates`
-   **説明**: 新しい通知テンプレートを作成します。
-   **リクエストヘッダー**:
    -   `Content-Type: application/json`
-   **リクエストボディ (JSON)**:
    ```json
    {
    "name": "string (必須, テンプレートの管理名)",
    "notionDatabaseId": "string (必須, 通知のトリガーとなる Notion データベースの ID)",
    "body": "string (必須, 通知メッセージの本文。プレースホルダ使用可)",
    "conditions": [
    {
    "propertyId": "string (必須, 条件の対象となる Notion プロパティの名前または ID)",
    "operator": "= | != | in | < | > | is_empty | is_not_empty (必須, 比較演算子)",
    "value": "any (比較する値。演算子やプロパティの型によって適切な値を設定)"
    }
    ],
    "destinationId": "string (必須, 通知を送信する先の Destination の ID)"
    }
    ```
-   **レスポンス (成功時)**:
    -   ステータスコード: `201 Created`
    -   ボディ (JSON): 作成されたテンプレートオブジェクト
        ```json
        {
        "id": "string (自動生成されたテンプレート ID)",
        "name": "string",
        "notionDatabaseId": "string",
        "body": "string",
        "conditions": [
        {
        "propertyId": "string",
        "operator": "string",
        "value": "any"
        }
        ],
        "destinationId": "string",
        "createdAt": "string (ISO 8601 形式の日時)",
        "updatedAt": "string (ISO 8601 形式の日時)"
        }
        ```
-   **レスポンス (エラー時)**:
    -   ステータスコード: `400 Bad Request` (リクエストボディが無効、必須フィールド不足など)
    -   ステータスコード: `500 Internal Server Error` (サーバー内部エラー)
    -   ボディ (JSON):
        ```json
        {
        "error": "エラーメッセージ文字列",
        "details": "エラー詳細文字列 (オプション)"
        }
        ```
-   **curl コマンド例**:
    ```bash
    curl -X POST http://localhost:3000/api/v1/templates \
     -H "Content-Type: application/json" \
     -d '{"name": "マイテンプレート","notionDatabaseId": "your_notion_database_id","body": "ページ「{名前}」が「{ステータス}」になりました！","conditions": [{"propertyId": "ステータス", "operator": "=", "value": "完了"}],"destinationId": "your_destination_id"}'
    ```

### 1.2. テンプレート一覧の取得

-   **エンドポイント**: `GET /api/v1/templates`
-   **説明**: 登録されている全ての通知テンプレートの一覧を取得します。
-   **レスポンス (成功時)**:
    -   ステータスコード: `200 OK`
    -   ボディ (JSON): テンプレートオブジェクトの配列 (各要素は 1.1 の成功レスポンスボディと同じ形式)
-   **curl コマンド例**:
    ```bash
    curl -X GET http://localhost:3000/api/v1/templates
    ```

### 1.3. 特定テンプレートの取得

-   **エンドポイント**: `GET /api/v1/templates/:id`
-   **説明**: 指定された ID の通知テンプレートを取得します。
-   **パスパラメータ**:
    -   `id` (string, 必須): 取得したいテンプレートの ID。
-   **レスポンス (成功時)**:
    -   ステータスコード: `200 OK`
    -   ボディ (JSON): テンプレートオブジェクト (1.1 の成功レスポンスボディと同じ形式)
-   **レスポンス (エラー時)**:
    -   ステータスコード: `404 Not Found` (指定された ID のテンプレートが見つからない場合)
    -   ボディ (JSON): `{"error": "Template not found"}`
-   **curl コマンド例**:
    ```bash
    curl -X GET http://localhost:3000/api/v1/templates/your_template_id_here
    ```

### 1.4. テンプレートの更新

-   **エンドポイント**: `PUT /api/v1/templates/:id`
-   **説明**: 指定された ID の通知テンプレートを更新します。リクエストボディには更新したいフィールドのみを含めます。
-   **パスパラメータ**:
    -   `id` (string, 必須): 更新したいテンプレートの ID。
-   **リクエストヘッダー**:
    -   `Content-Type: application/json`
-   **リクエストボディ (JSON)**: 更新したいフィールドと値。以下のいずれか、または複数。
    ```json
    {
    "name": "string (オプション)",
    "notionDatabaseId": "string (オプション)",
    "body": "string (オプション)",
    "conditions": [ /* ... */ ], // (オプション)
    "destinationId": "string (オプション)"
    }
    ```
-   **レスポンス (成功時)**:
    -   ステータスコード: `200 OK`
    -   ボディ (JSON): 更新されたテンプレートオブジェクト (1.1 の成功レスポンスボディと同じ形式)
-   **レスポンス (エラー時)**:
    -   ステータスコード: `400 Bad Request`, `404 Not Found`, `500 Internal Server Error`
-   **curl コマンド例**:
    ```bash
    curl -X PUT http://localhost:3000/api/v1/templates/your_template_id_here \
     -H "Content-Type: application/json" \
     -d '{"name": "更新後のテンプレート名", "body": "更新されたメッセージ本文！"}'
    ```

### 1.5. テンプレートの削除

-   **エンドポイント**: `DELETE /api/v1/templates/:id`
-   **説明**: 指定された ID の通知テンプレートを削除します。
-   **パスパラメータ**:
    -   `id` (string, 必須): 削除したいテンプレートの ID。
-   **レスポンス (成功時)**:
    -   ステータスコード: `204 No Content` (レスポンスボディなし)
-   **レスポンス (エラー時)**:
    -   ステータスコード: `404 Not Found` (ハンドラの実装により、見つからない場合でも 204 を返すこともあります)
    -   ステータスコード: `500 Internal Server Error`
-   **curl コマンド例**:
    ```bash
    curl -X DELETE http://localhost:3000/api/v1/templates/your_template_id_here
    ```

## 2. Destinations (通知送信先管理)

通知を送信する先の Webhook URL を管理するためのエンドポイントです。

### 2.1. 送信先の登録

-   **エンドポイント**: `POST /api/v1/destinations`
-   **説明**: 新しい通知送信先 (Webhook URL) を登録します。
-   **リクエストヘッダー**:
    -   `Content-Type: application/json`
-   **リクエストボディ (JSON)**:
    ```json
    {
    "name": "string (オプション, 送信先の管理用名称)",
    "webhookUrl": "string (必須, 通知先サービスの Webhook URL)"
    }
    ```
-   **レスポンス (成功時)**:
    -   ステータスコード: `201 Created`
    -   ボディ (JSON): 作成された送信先オブジェクト
        ```json
        {
        "id": "string (自動生成された送信先 ID)",
        "name": "string (オプション)",
        "webhookUrl": "string",
        "createdAt": "string (ISO 8601 形式の日時)",
        "updatedAt": "string (ISO 8601 形式の日時)"
        }
        ```
-   **curl コマンド例**:
    ```bash
    curl -X POST http://localhost:3000/api/v1/destinations \
     -H "Content-Type: application/json" \
     -d '{"name": "マイ Discord チャンネル","webhookUrl": "https://discord.com/api/webhooks/your_webhook_url"}'
    ```

### 2.2. 送信先一覧の取得

-   **エンドポイント**: `GET /api/v1/destinations`
-   **説明**: 登録されている全ての通知送信先の一覧を取得します。
-   **レスポンス (成功時)**:
    -   ステータスコード: `200 OK`
    -   ボディ (JSON): 送信先オブジェクトの配列 (各要素は 2.1 の成功レスポンスボディと同じ形式)
-   **curl コマンド例**:
    ```bash
    curl -X GET http://localhost:3000/api/v1/destinations
    ```

### 2.3. 特定送信先の取得

-   **エンドポイント**: `GET /api/v1/destinations/:id`
-   **説明**: 指定された ID の通知送信先を取得します。
-   **パスパラメータ**:
    -   `id` (string, 必須): 取得したい送信先の ID。
-   **レスポンス (成功時)**:
    -   ステータスコード: `200 OK`
    -   ボディ (JSON): 送信先オブジェクト (2.1 の成功レスポンスボディと同じ形式)
-   **レスポンス (エラー時)**:
    -   ステータスコード: `404 Not Found`
-   **curl コマンド例**:
    ```bash
    curl -X GET http://localhost:3000/api/v1/destinations/your_destination_id_here
    ```

### 2.4. 送信先の更新

-   **エンドポイント**: `PUT /api/v1/destinations/:id`
-   **説明**: 指定された ID の通知送信先を更新します。リクエストボディには更新したいフィールドのみを含めます。
-   **パスパラメータ**:
    -   `id` (string, 必須): 更新したい送信先の ID。
-   **リクエストヘッダー**:
    -   `Content-Type: application/json`
-   **リクエストボディ (JSON)**: 更新したいフィールドと値。
    ```json
    {
    "name": "string (オプション)",
    "webhookUrl": "string (オプション)"
    }
    ```
-   **レスポンス (成功時)**:
    -   ステータスコード: `200 OK`
    -   ボディ (JSON): 更新された送信先オブジェクト (2.1 の成功レスポンスボディと同じ形式)
-   **レスポンス (エラー時)**:
    -   ステータスコード: `400 Bad Request`, `404 Not Found`, `500 Internal Server Error`
-   **curl コマンド例**:
    ```bash
    curl -X PUT http://localhost:3000/api/v1/destinations/your_destination_id_here \
     -H "Content-Type: application/json" \
     -d '{"name": "更新後の送信先名"}'
    ```

### 2.5. 送信先の削除

-   **エンドポイント**: `DELETE /api/v1/destinations/:id`
-   **説明**: 指定された ID の通知送信先を削除します。
-   **パスパラメータ**:
    -   `id` (string, 必須): 削除したい送信先の ID。
-   **レスポンス (成功時)**:
    -   ステータスコード: `204 No Content`
-   **レスポンス (エラー時)**:
    -   ステータスコード: `404 Not Found`, `500 Internal Server Error`
-   **curl コマンド例**:
    ```bash
    curl -X DELETE http://localhost:3000/api/v1/destinations/your_destination_id_here
    ```

## 3. Notion Webhook 受信

Notion からの Webhook リクエストを受信し、通知処理を開始するためのエンドポイントです。

### 3.1. Webhook 受信

-   **エンドポイント**: `POST /webhooks/notion`
-   **説明**: Notion のデータベース自動化から送信される Webhook リクエストを受信します。
-   **リクエストヘッダー**:
    -   `Content-Type: application/json`
    -   (将来的には Notion からの署名ヘッダー `X-Notion-Signature-V1` 等の検証が必要)
-   **リクエストボディ (JSON)**: Notion から送信される Webhook ペイロード。詳細は Notion のドキュメントを参照してください。基本的な構造は以下のようになります。
    ```json
    {
    "source": { /_ Webhook のソース情報 _/ },
    "data": {
    "object": "page",
    "id": "ページ ID",
    "parent": { "type": "database_id", "database_id": "データベース ID" },
    "properties": { /_ 更新されたページのプロパティ情報 _/ },
    "url": "ページ URL"
    // ...その他ページ情報
    }
    }
    ```
-   **レスポンス (成功時)**:
    -   ステータスコード: `200 OK`
    -   ボディ (JSON):
        ```json
        {
        "message": "Webhook received"
        }
        ```
    -   **注意**: このエンドポイントはリクエストを受け付けたことを示す 200 を返し、実際の通知処理はバックグラウンドで非同期的に行われることを想定しています。
-   **レスポンス (エラー時)**:
    -   ステータスコード: `400 Bad Request`, `401 Unauthorized` (認証失敗時), `500 Internal Server Error`
-   **Notion 側での設定**:
    -   Notion のデータベースの自動化設定で、トリガー（例: ページのプロパティ更新）とアクション（Webhook 送信）を設定し、このエンドポイントの URL を指定します。
    -   ローカル開発環境でテストする場合、ngrok 等のトンネリングツールを使用して、ローカルサーバー (`http://localhost:3000`) を外部に公開し、その公開 URL を Notion に設定する必要があります。
