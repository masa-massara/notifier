# アプリケーションアーキテクチャ

Notifier アプリは、変更容易性、テスト容易性、関心の分離を重視し、クリーンアーキテクチャの原則に基づいて設計されています。
このアーキテクチャにより、各コンポーネントは独立して開発・テストが可能となり、将来的な機能追加や技術変更にも柔軟に対応できます。

## レイヤー構造

アプリケーションは、大きく分けて以下の 4 つのレイヤーで構成されています。依存関係は常に外側のレイヤーから内側のレイヤーへ向かい、内側のレイヤーは外側のレイヤーについて関知しません。

```mermaid
graph TD
    A["プレゼンテーション層<br>(Hono, Handlers, AuthMiddleware)"] --> B["アプリケーション層<br>(UseCases, DTOs, Application Services like EncryptionService)"]; %% AuthMiddleware, EncryptionService を追記
    B --> C["ドメイン層<br>(Entities including UserNotionIntegration, Value Objects, Repository Interfaces like UserNotionIntegrationRepository, Domain Services)"]; %% Entities, Repo Interfaces を更新
    A --> D["インフラストラクチャ層<br>(Firestore Implementations like FirestoreUserNotionIntegrationRepository, Notion API Client, Cache, Notification Client, Firebase Admin SDK, NodeCryptoEncryptionService)"]; %% Firestore Impl, NodeCryptoEncryptionService を追記
    B -.-> D;
    subgraph "ドメインの核"
        C
    end
    subgraph "固有のビジネスルール"
        B
    end
    subgraph "外部とのインターフェース"
        A
    end
    subgraph "フレームワーク、ドライバ、外部ツール"
        D
    end

    style C fill:#f9f,stroke:#333,stroke-width:2px
    style B fill:#ccf,stroke:#333,stroke-width:2px
    style A fill:#cfc,stroke:#333,stroke-width:2px
    style D fill:#ffc,stroke:#333,stroke-width:2px

```

-   **ドメイン層 (Domain Layer)**:
    -   アプリケーションの核となるビジネスロジックとエンティティを定義します。
    -   **エンティティ (`Template`, `Destination`, `UserNotionIntegration`)**: アプリケーションの主要なビジネスオブジェクト。自身のデータとそれに関連するバリデーションルールを持ちます。`userId` フィールドによりリソース所有者を識別します。`UserNotionIntegration` はユーザーのNotionインテグレーションTOKEN（暗号化済み）と関連情報を保持します。`Template` は `userNotionIntegrationId` を持ち、特定のNotion連携を参照します。
    -   **値オブジェクト**: 特定の意味を持つ不変のデータ（例: Webhook URL、テンプレート本文など）。
    -   **リポジトリインターフェース (`TemplateRepository`, `DestinationRepository`, `UserNotionIntegrationRepository`)**: エンティティの永続化操作の契約（インターフェース）を定義します。具体的な実装はインフラストラクチャ層に委ねます。
    -   **ドメインサービス (`NotionApiService`, `MessageFormatterService`, `NotificationClient`, `templateMatcherService`)**: 特定のエンティティに属さない、ドメイン固有のロジックや外部サービスとの契約を定義・実装します。`NotionApiService` の `getDatabaseSchema` はユーザー固有のTOKENを引数に取るように変更されました。

-   **アプリケーション層 (Application Layer)**:
    -   アプリケーション固有のビジネスルール（ユースケース）を実装します。
    -   **ユースケース (`CreateTemplateUseCase`, `ProcessNotionWebhookUseCase`, `CreateUserNotionIntegrationUseCase`, `ListUserNotionIntegrationsUseCase`, `DeleteUserNotionIntegrationUseCase` など)**: ユーザーや他のシステムがアプリケーションに対して実行したい具体的な操作を定義します。ドメイン層のエンティティやリポジトリインターフェース、サービスを利用して処理を実行します。
    -   **DTO (Data Transfer Objects)**: ユースケースの入力 (`XxxInput`) および出力 (`XxxOutput`) のためのデータ構造を定義します。
    -   **アプリケーションサービス (`MessageFormatterServiceImpl`, `EncryptionService`)**: ユースケースを補助するサービス。`EncryptionService` はNotionインテグレーションTOKENの暗号化・復号化を担当します。

-   **インフラストラクチャ層 (Infrastructure Layer)**:
    -   フレームワーク、ライブラリ、外部サービスへの具体的な実装詳細を扱います。
    -   **永続化実装 (`FirestoreTemplateRepository`, `FirestoreDestinationRepository`, `FirestoreUserNotionIntegrationRepository`, `InMemoryCacheService`など)**: ドメイン層で定義されたリポジトリインターフェースやサービスインターフェースの具体的な実装を提供します。
    -   **サービス実装 (`NodeCryptoEncryptionService`)**: アプリケーション層で定義されたサービスインターフェース（例: `EncryptionService`）の具体的な実装を提供します。
    -   **Web クライアント (`NotionApiClient`, `HttpNotificationClient`など)**: Notion API や外部チャットツールの Webhook など、外部 API との通信を行う具体的な実装を提供します。`NotionApiClient` はグローバルTOKENではなく、メソッド呼び出し時にユーザー固有のTOKENを使用するように変更されました。
    -   **設定 (`docker-compose.yml`, `.env`など)**: 環境変数（例: `ENCRYPTION_KEY`）や外部サービスへの接続情報などを管理します。
    -   **認証基盤連携 (Firebase Admin SDK)**: Firebase Authentication との連携を担当します。IDトークンの検証やユーザー情報の取得など。

-   **プレゼンテーション層 (Presentation Layer)**:
    -   ユーザーや外部システムとのインターフェースを担当します。
    -   **Hono フレームワーク関連**: ルーティング定義 (`src/main.ts`)、リクエストハンドラ (`src/presentation/handlers/`)、ミドルウェア、リクエストバリデーションなど。
    -   -   **認証ミドルウェア (`authMiddleware.ts`)**: 保護対象のAPIエンドポイントへのリクエストヘッダーに含まれるFirebase IDトークンを検証し、成功した場合はデコードされたユーザー情報（特に`userId`）をリクエストコンテキストに格納します。認証に失敗した場合はエラーレスポンスを返します。
    -   リクエストを受け取り、適切なアプリケーション層のユースケースに処理を委譲し、ユースケースからの結果を HTTP レスポンスとして返します。

## 主要なデータの流れ

### 1. ユーザーNotion連携の登録フロー

1.  **リクエスト受信**: クライアント（ユーザー）が、自身のNotionインテグレーションTOKENと管理名をリクエストボディに含め、`POST /api/v1/me/notion-integrations` エンドポイントにリクエストします。リクエストにはFirebase IDトークンが `Authorization` ヘッダーに含まれます (プレゼンテーション層)。
2.  **認証**: `authMiddleware` がIDトークンを検証し、`userId` をリクエストコンテキストに設定します (プレゼンテーション層)。
3.  **ハンドラ処理**: `UserNotionIntegrationHandler` がリクエストを処理し、`CreateUserNotionIntegrationInput` DTOを組み立てます (プレゼンテーション層)。
4.  **ユースケース実行**: `CreateUserNotionIntegrationUseCase` が実行されます (アプリケーション層)。
    -   **トークン暗号化**: `EncryptionService` (実装: `NodeCryptoEncryptionService`) を使用して、提供された `notionIntegrationToken` を暗号化します。
    -   **エンティティ生成**: `UserNotionIntegration` エンティティを生成します（暗号化されたトークンを含む）。
    -   **永続化**: `UserNotionIntegrationRepository` (実装: `FirestoreUserNotionIntegrationRepository`) を介してエンティティを保存します。
5.  **レスポンス返却**: 作成された連携情報（トークン自体は含まない）がハンドラに返され、HTTPレスポンスとしてクライアントに返却されます (アプリケーション層 → プレゼンテーション層)。

### 2. テンプレート作成フロー (更新版)

1.  **リクエスト受信**: クライアントが、テンプレート情報（`name`, `notionDatabaseId`, `body`, `conditions`, `destinationId`, **`userNotionIntegrationId`**）を含むリクエストを `POST /api/v1/templates` に送信します。リクエストにはFirebase IDトークンが含まれます (プレゼンテーション層)。
2.  **認証**: `authMiddleware` がIDトークンを検証し、`userId` をリクエストコンテキストに設定します (プレゼンテーション層)。
3.  **ハンドラ処理**: `TemplateHandler` がリクエストを処理し、`CreateTemplateInput` DTOを組み立てます (プレゼンテーション層)。
4.  **ユースケース実行**: `CreateTemplateUseCase` が実行されます (アプリケーション層)。
    -   **Notion連携検証**:
        -   提供された `userNotionIntegrationId` と `userId` を使用して `UserNotionIntegrationRepository` から該当の `UserNotionIntegration` を取得します。
        -   取得した連携情報から暗号化されたトークンを `EncryptionService` で復号化します。
        -   復号化されたトークンと `notionDatabaseId` を使用して `NotionApiService.getDatabaseSchema()` を呼び出し、データベースへのアクセスとスキーマの有効性を検証します。
    -   **エンティティ生成**: 検証後、`Template` エンティティを生成します（`userNotionIntegrationId` を含む）。
    -   **永続化**: `TemplateRepository` を介してエンティティを保存します。
5.  **レスポンス返却**: 作成されたテンプレート情報（`userNotionIntegrationId` を含む）がハンドラに返され、HTTPレスポンスとしてクライアントに返却されます (アプリケーション層 → プレゼンテーション層)。

### 3. Webhook 処理フロー (更新版)

1.  **Webhook 受信**: Notion からの Webhook リクエストが `/webhooks/notion` エンドポイントに到着します (プレゼンテーション層)。
2.  **ユースケース実行**: `NotionWebhookHandler` がリクエストを `ProcessNotionWebhookUseCase` に渡します (プレゼンテーション層 → アプリケーション層)。
3.  **テンプレート取得**: `ProcessNotionWebhookUseCase` は受信データから `databaseId` を抽出し、`TemplateRepository.findAllByNotionDatabaseId()` を使って、その `databaseId` に関連する**全ての**テンプレートを取得します (アプリケーション層 → ドメインリポジトリ → インフラストラクチャ層)。
4.  **スキーマ取得 (1回/databaseId)**:
    -   `databaseSchema` がまだ取得されていない場合、取得したテンプレートのリストを反復処理します。
    -   各テンプレートについて:
        -   `template.userNotionIntegrationId` が設定されていなければスキップします。
        -   `UserNotionIntegrationRepository` を使って `UserNotionIntegration` を取得します（`template.userId` と `template.userNotionIntegrationId` を使用）。
        -   `EncryptionService` を使ってトークンを復号化します。
        -   復号化されたトークンを使い、`NotionApiService.getDatabaseSchema()` でデータベーススキーマを取得します。
        -   スキーマ取得に成功したら、このスキーマを後続処理で使用し、他のテンプレートからのトークンでの再取得は行いません (ループを抜けるかフラグ管理)。
    -   どのテンプレートの連携情報を使ってもスキーマが取得できなかった場合、エラーとして処理を中断します。
5.  **条件照合**: `templateMatcherService` が、受信したページプロパティ、取得した全テンプレート（ステップ3）、およびデータベーススキーマ（ステップ4）を元に、条件に一致するテンプレートを特定します (アプリケーション層 → ドメインサービス)。
6.  **メッセージ整形**: `MessageFormatterService`が、一致した各テンプレートとページプロパティ、スキーマを元に、通知メッセージを整形します (アプリケーション層 → ドメインサービス)。
7.  **送信先取得・通知送信**: 整形されたメッセージごとに、マッチしたテンプレートの`userId`と`destinationId`を使って`DestinationRepository`から送信先 Webhook URL を取得し、`NotificationClient`を使って外部チャットツールへ通知を送信します (アプリケーション層 → ドメインリポジトリ/サービス → インフラストラクチャ層)。

このアーキテクチャにより、各コンポーネントの責務が明確になり、柔軟で保守性の高いアプリケーションを目指しています。
