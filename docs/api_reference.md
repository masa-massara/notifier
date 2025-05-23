# API エンドポイント仕様

このドキュメントでは、Notifier アプリが提供する API エンドポイントの詳細な仕様について説明します。

ベース URL: `http://localhost:3000` (開発環境の場合。デプロイ環境では異なります)

## 認証について

`/api/v1/templates` および `/api/v1/destinations` で始まるエンドポイントへのリクエストは、Firebase Authentication によって発行されたIDトークンによる認証が必要です。

リクエストを行う際には、以下の形式で `Authorization` ヘッダーにIDトークンを含めてください。

`Authorization: Bearer <ID_TOKEN>`

`<ID_TOKEN>` の部分には、Firebase Client SDKなどを通じて取得した有効なIDトークンを指定します。

### 認証エラー時のレスポンス

認証に失敗した場合、主に以下のHTTPステータスコードとレスポンスボディが返されます。

* **`401 Unauthorized`**:
    * IDトークンが提供されていない、形式が不正、無効、または期限切れの場合。
    * レスポンスボディ例:
        ```json
        {
          "error": "Unauthorized",
          "message": "Bearer token is missing or invalid."
        }
        ```
* **`403 Forbidden`**:
    * IDトークンは有効だが、要求されたリソースへのアクセス権がない場合（例: 他のユーザーのリソースを操作しようとした場合）。
    * レスポンスボディ例:
        ```json
        {
          "error": "Forbidden or Not Found",
          "details": "Resource not found or not accessible by user."
        }
        ```

## 1. Templates (通知テンプレート管理)

通知メッセージのテンプレートを作成、取得、更新、削除するためのエンドポイントです。

### 1.1. テンプレートの作成

-   **エンドポイント**: `POST /api/v1/templates`
-   **説明**: 新しい通知テンプレートを作成します。**認証が必要です。**
-   **リクエストヘッダー**:
    -   `Content-Type: application/json`
    -   `Authorization: Bearer <ID_TOKEN>`
-   **リクエストボディ (JSON)**:
    ```json
    {
      "name": "string (必須, テンプレートの管理名)",
      "notionDatabaseId": "string (必須, 通知のトリガーとなる Notion データベースの ID)",
      "userNotionIntegrationId": "string (必須, このテンプレートが使用する User Notion Integration の ID)",
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
          "userNotionIntegrationId": "string | null (テンプレートが使用する User Notion Integration の ID)",
          "body": "string",
          "conditions": [ /* ... */ ],
          "destinationId": "string",
          "userId": "string (テンプレート所有者のユーザーID)",
          "createdAt": "string (ISO 8601 形式の日時)",
          "updatedAt": "string (ISO 8601 形式の日時)"
        }
        ```
-   **レスポンス (エラー時)**:
    -   ステータスコード: `400 Bad Request`
    -   ステータスコード: `401 Unauthorized`
    -   ステータスコード: `500 Internal Server Error`
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
     -H "Authorization: Bearer YOUR_ID_TOKEN_HERE" \
     -d '{"name": "マイテンプレート","notionDatabaseId": "your_notion_database_id","body": "ページ「{名前}」が「{ステータス}」になりました！","conditions": [{"propertyId": "ステータス", "operator": "=", "value": "完了"}],"destinationId": "your_destination_id"}'
    ```

### 1.2. テンプレート一覧の取得

-   **エンドポイント**: `GET /api/v1/templates`
-   **説明**: 認証されたユーザーが所有する通知テンプレートの一覧を取得します。**認証が必要です。**
-   **リクエストヘッダー**:
    -   `Authorization: Bearer <ID_TOKEN>`
-   **レスポンス (成功時)**:
    -   ステータスコード: `200 OK`
    -   ボディ (JSON): テンプレートオブジェクトの配列
-   **レスポンス (エラー時)**:
    -   ステータスコード: `401 Unauthorized`
    -   ステータスコード: `500 Internal Server Error`
-   **curl コマンド例**:
    ```bash
    curl -X GET http://localhost:3000/api/v1/templates \
     -H "Authorization: Bearer YOUR_ID_TOKEN_HERE"
    ```

### 1.3. 特定テンプレートの取得

-   **エンドポイント**: `GET /api/v1/templates/:id`
-   **説明**: 指定された ID の通知テンプレートを取得します。認証されたユーザーが所有するものに限ります。**認証が必要です。**
-   **パスパラメータ**:
    -   `id` (string, 必須): 取得したいテンプレートの ID。
-   **リクエストヘッダー**:
    -   `Authorization: Bearer <ID_TOKEN>`
-   **レスポンス (成功時)**:
    -   ステータスコード: `200 OK`
    -   ボディ (JSON): テンプレートオブジェクト
-   **レスポンス (エラー時)**:
    -   ステータスコード: `401 Unauthorized`
    -   ステータスコード: `403 Forbidden`
    -   ステータスコード: `404 Not Found`
-   **curl コマンド例**:
    ```bash
    curl -X GET http://localhost:3000/api/v1/templates/your_template_id_here \
     -H "Authorization: Bearer YOUR_ID_TOKEN_HERE"
    ```

### 1.4. テンプレートの更新

-   **エンドポイント**: `PUT /api/v1/templates/:id`
-   **説明**: 指定された ID の通知テンプレートを更新します。認証されたユーザーが所有するものに限ります。**認証が必要です。**
-   **パスパラメータ**:
    -   `id` (string, 必須): 更新したいテンプレートの ID。
-   **リクエストヘッダー**:
    -   `Content-Type: application/json`
    -   `Authorization: Bearer <ID_TOKEN>`
-   **リクエストボディ (JSON)**: 更新したいフィールドと値。
    ```json
    {
      "name": "string (オプション)",
      "notionDatabaseId": "string (オプション)",
      "userNotionIntegrationId": "string | null (オプション, このテンプレートが使用する User Notion Integration の ID。null を指定すると連携解除)",
      "body": "string (オプション)",
      "conditions": [ /* ... */ ],
      "destinationId": "string (オプション)"
    }
    ```
-   **レスポンス (成功時)**:
    -   ステータスコード: `200 OK`
    -   ボディ (JSON): 更新されたテンプレートオブジェクト (上記1.1.の成功レスポンスボディと同様の形式)
-   **レスポンス (エラー時)**:
    -   `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`
-   **curl コマンド例**:
    ```bash
    curl -X PUT http://localhost:3000/api/v1/templates/your_template_id_here \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_ID_TOKEN_HERE" \
     -d '{"name": "更新後のテンプレート名", "body": "更新されたメッセージ本文！", "userNotionIntegrationId": "new_integration_id"}'
    ```

### 1.5. テンプレートの削除

-   **エンドポイント**: `DELETE /api/v1/templates/:id`
-   **説明**: 指定された ID の通知テンプレートを削除します。認証されたユーザーが所有するものに限ります。**認証が必要です。**
-   **パスパラメータ**:
    -   `id` (string, 必須): 削除したいテンプレートの ID。
-   **リクエストヘッダー**:
    -   `Authorization: Bearer <ID_TOKEN>`
-   **レスポンス (成功時)**:
    -   ステータスコード: `204 No Content`
-   **レスポンス (エラー時)**:
    -   `401 Unauthorized`, `403 Forbidden`, `404 Not Found`
    -   ステータスコード: `500 Internal Server Error`
-   **curl コマンド例**:
    ```bash
    curl -X DELETE http://localhost:3000/api/v1/templates/your_template_id_here \
     -H "Authorization: Bearer YOUR_ID_TOKEN_HERE"
    ```

## 2. User Notion Integrations (ユーザーNotion連携管理)

認証されたユーザーが自身のNotionインテグレーションTOKENを登録・管理するためのエンドポイントです。ここで登録されたNotion連携は、通知テンプレート作成時に指定することで、そのテンプレートがユーザーのNotionデータベースにアクセスする際に使用されます。

### 2.1. Notion連携の登録

-   **エンドポイント**: `POST /api/v1/me/notion-integrations`
-   **説明**: 認証されたユーザーのために新しいNotion連携を登録します。**認証が必要です。**
-   **リクエストヘッダー**:
    -   `Content-Type: application/json`
    -   `Authorization: Bearer <ID_TOKEN>`
-   **リクエストボディ (JSON)**:
    ```json
    {
      "integrationName": "string (必須, この連携の管理名)",
      "notionIntegrationToken": "string (必須, ユーザーのNotion内部インテグレーションTOKEN)"
    }
    ```
-   **レスポンス (成功時)**:
    -   ステータスコード: `201 Created`
    -   ボディ (JSON): 作成されたNotion連携情報（**注意: `notionIntegrationToken` は返却されません**）
        ```json
        {
          "id": "string (自動生成された連携ID)",
          "integrationName": "string",
          "userId": "string (所有者のユーザーID)",
          "createdAt": "string (ISO 8601 形式の日時)",
          "updatedAt": "string (ISO 8601 形式の日時)"
        }
        ```
-   **レスポンス (エラー時)**:
    -   ステータスコード: `400 Bad Request` (例: 必須フィールドの欠如)
    -   ステータスコード: `401 Unauthorized`
    -   ステータスコード: `500 Internal Server Error`
-   **curl コマンド例**:
    ```bash
    curl -X POST http://localhost:3000/api/v1/me/notion-integrations \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_ID_TOKEN_HERE" \
     -d '{"integrationName": "マイ Notion ワークスペース連携", "notionIntegrationToken": "secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"}'
    ```

### 2.2. Notion連携一覧の取得

-   **エンドポイント**: `GET /api/v1/me/notion-integrations`
-   **説明**: 認証されたユーザーが登録したNotion連携の一覧を取得します。**認証が必要です。**
-   **リクエストヘッダー**:
    -   `Authorization: Bearer <ID_TOKEN>`
-   **レスポンス (成功時)**:
    -   ステータスコード: `200 OK`
    -   ボディ (JSON): Notion連携情報の配列（**注意: `notionIntegrationToken` は返却されません**）
        ```json
        [
          {
            "id": "string",
            "integrationName": "string",
            "createdAt": "string (ISO 8601 形式の日時)",
            "updatedAt": "string (ISO 8601 形式の日時)"
          }
        ]
        ```
-   **レスポンス (エラー時)**:
    -   ステータスコード: `401 Unauthorized`
    -   ステータスコード: `500 Internal Server Error`
-   **curl コマンド例**:
    ```bash
    curl -X GET http://localhost:3000/api/v1/me/notion-integrations \
     -H "Authorization: Bearer YOUR_ID_TOKEN_HERE"
    ```

### 2.3. Notion連携の削除

-   **エンドポイント**: `DELETE /api/v1/me/notion-integrations/:integrationId`
-   **説明**: 指定されたIDのNotion連携を削除します。認証されたユーザーが所有するものに限ります。**認証が必要です。**
-   **パスパラメータ**:
    -   `integrationId` (string, 必須): 削除したいNotion連携のID。
-   **リクエストヘッダー**:
    -   `Authorization: Bearer <ID_TOKEN>`
-   **レスポンス (成功時)**:
    -   ステータスコード: `200 OK`
    -   ボディ (JSON):
        ```json
        {
          "success": true,
          "message": "Notion integration deleted successfully."
        }
        ```
        (または、ステータスコード `204 No Content` でボディなし)
-   **レスポンス (エラー時)**:
    -   ステータスコード: `401 Unauthorized`
    -   ステータスコード: `403 Forbidden` (他のユーザーのリソースを削除しようとした場合)
    -   ステータスコード: `404 Not Found`
    -   ステータスコード: `500 Internal Server Error`
-   **curl コマンド例**:
    ```bash
    curl -X DELETE http://localhost:3000/api/v1/me/notion-integrations/your_integration_id_here \
     -H "Authorization: Bearer YOUR_ID_TOKEN_HERE"
    ```

## 4. Destinations (通知送信先管理)

通知を送信する先の Webhook URL を管理するためのエンドポイントです。

### 2.1. 送信先の登録
-   **エンドポイント**: `POST /api/v1/destinations`
-   **説明**: 新しい通知送信先 (Webhook URL) を登録します。**認証が必要です。**
-   **リクエストヘッダー**:
    -   `Content-Type: application/json`
    -   `Authorization: Bearer <ID_TOKEN>`
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
          "userId": "string (送信先所有者のユーザーID)",
          "createdAt": "string (ISO 8601 形式の日時)",
          "updatedAt": "string (ISO 8601 形式の日時)"
        }
        ```
-   **curl コマンド例**:
    ```bash
    curl -X POST http://localhost:3000/api/v1/destinations \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_ID_TOKEN_HERE" \
     -d '{"name": "マイ Discord チャンネル","webhookUrl": "https://discord.com/api/webhooks/your_webhook_url"}'
    ```

### 2.2. 送信先一覧の取得
-   **エンドポイント**: `GET /api/v1/destinations`
-   **説明**: 認証されたユーザーが所有する通知送信先の一覧を取得します。**認証が必要です。**
-   **リクエストヘッダー**:
    -   `Authorization: Bearer <ID_TOKEN>`
-   **レスポンス (成功時)**:
    -   ステータスコード: `200 OK`
    -   ボディ (JSON): 送信先オブジェクトの配列
-   **curl コマンド例**:
    ```bash
    curl -X GET http://localhost:3000/api/v1/destinations \
     -H "Authorization: Bearer YOUR_ID_TOKEN_HERE"
    ```

### 2.3. 特定送信先の取得
-   **エンドポイント**: `GET /api/v1/destinations/:id`
-   **説明**: 指定された ID の通知送信先を取得します。認証されたユーザーが所有するものに限ります。**認証が必要です。**
-   **パスパラメータ**:
    -   `id` (string, 必須): 取得したい送信先の ID。
-   **リクエストヘッダー**:
    -   `Authorization: Bearer <ID_TOKEN>`
-   **レスポンス (成功時)**:
    -   ステータスコード: `200 OK`
    -   ボディ (JSON): 送信先オブジェクト
-   **レスポンス (エラー時)**:
    -   `401 Unauthorized`, `403 Forbidden`, `404 Not Found`
-   **curl コマンド例**:
    ```bash
    curl -X GET http://localhost:3000/api/v1/destinations/your_destination_id_here \
     -H "Authorization: Bearer YOUR_ID_TOKEN_HERE"
    ```

### 2.4. 送信先の更新
-   **エンドポイント**: `PUT /api/v1/destinations/:id`
-   **説明**: 指定された ID の通知送信先を更新します。認証されたユーザーが所有するものに限ります。**認証が必要です。**
-   **パスパラメータ**:
    -   `id` (string, 必須): 更新したい送信先の ID。
-   **リクエストヘッダー**:
    -   `Content-Type: application/json`
    -   `Authorization: Bearer <ID_TOKEN>`
-   **リクエストボディ (JSON)**: 更新したいフィールドと値。
    ```json
    {
      "name": "string (オプション)",
      "webhookUrl": "string (オプション)"
    }
    ```
-   **レスポンス (成功時)**:
    -   ステータスコード: `200 OK`
    -   ボディ (JSON): 更新された送信先オブジェクト
-   **レスポンス (エラー時)**:
    -   `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`
-   **curl コマンド例**:
    ```bash
    curl -X PUT http://localhost:3000/api/v1/destinations/your_destination_id_here \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_ID_TOKEN_HERE" \
     -d '{"name": "更新後の送信先名"}'
    ```

### 2.5. 送信先の削除
-   **エンドポイント**: `DELETE /api/v1/destinations/:id`
-   **説明**: 指定された ID の通知送信先を削除します。認証されたユーザーが所有するものに限ります。**認証が必要です。**
-   **パスパラメータ**:
    -   `id` (string, 必須): 削除したい送信先の ID。
-   **リクエストヘッダー**:
    -   `Authorization: Bearer <ID_TOKEN>`
-   **レスポンス (成功時)**:
    -   ステータスコード: `204 No Content`
-   **レスポンス (エラー時)**:
    -   `401 Unauthorized`, `403 Forbidden`, `404 Not Found`
-   **curl コマンド例**:
    ```bash
    curl -X DELETE http://localhost:3000/api/v1/destinations/your_destination_id_here \
     -H "Authorization: Bearer YOUR_ID_TOKEN_HERE"
    ```

## 5. Notion Webhook 受信

Notion からの Webhook リクエストを受信し、通知処理を開始するためのエンドポイントです。

### 5.1. Webhook 受信

-   **エンドポイント**: `POST /webhooks/notion`
-   **説明**: Notion のデータベース自動化から送信される Webhook リクエストを受信します。
    **このエンドポイントは、Firebase AuthenticationによるIDトークン認証の対象外です。** Notionからのリクエストは、将来的には署名検証など別の方法で認証されることが望ましいです。
-   **リクエストヘッダー**:
    -   `Content-Type: application/json`
-   **リクエストボディ (JSON)**: Notion から送信される Webhook ペイロード。
    ```json
    {
      "source": { /* Webhook のソース情報 */ },
      "data": {
        "object": "page",
        "id": "ページ ID",
        "parent": { "type": "database_id", "database_id": "データベース ID" },
        "properties": { /* 更新されたページのプロパティ情報 */ },
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
-   **レスポンス (エラー時)**:
    -   ステータスコード: `400 Bad Request`, `500 Internal Server Error`
