# アプリケーションアーキテクチャ

Notifier アプリは、変更容易性、テスト容易性、関心の分離を重視し、クリーンアーキテクチャの原則に基づいて設計されています。
このアーキテクチャにより、各コンポーネントは独立して開発・テストが可能となり、将来的な機能追加や技術変更にも柔軟に対応できます。

## レイヤー構造

アプリケーションは、大きく分けて以下の 4 つのレイヤーで構成されています。依存関係は常に外側のレイヤーから内側のレイヤーへ向かい、内側のレイヤーは外側のレイヤーについて関知しません。

```mermaid
graph TD
    A["プレゼンテーション層<br>(Hono, Handlers, AuthMiddleware, /api/v1/me/notion-integrations)"] --> B["アプリケーション層<br>(UseCases including UserNotionIntegration, DTOs, Application Services)"]; %% Updated
    B --> C["ドメイン層<br>(Entities including UserNotionIntegration, Value Objects, Repository Interfaces including UserNotionIntegrationRepository, Domain Services including EncryptionService)"]; %% Updated
    A --> D["インフラストラクチャ層<br>(Firestore, Notion API Client (dynamic token), Cache, Notification Client, Firebase Admin SDK, CryptoEncryptionService)"]; %% Updated
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
    -   **エンティティ (`Template`, `Destination`, `UserNotionIntegration`)**:
        -   `Template`: 通知テンプレート。`userId` に加え、`userNotionIntegrationId` を持つようになり、どのユーザーのどのNotionインテグレーションを使用するかを関連付けます。
        -   `Destination`: 通知送信先。
        -   `UserNotionIntegration`: ユーザーが登録したNotionインテグレーション情報を保持します (`id, userId, integrationName, encryptedNotionIntegrationToken, createdAt, updatedAt`)。実際のトークンは暗号化されて保存されます。
    -   **値オブジェクト**: 特定の意味を持つ不変のデータ（例: Webhook URL、テンプレート本文など）。
    -   **リポジトリインターフェース (`TemplateRepository`, `DestinationRepository`, `UserNotionIntegrationRepository`)**: エンティティの永続化操作の契約を定義します。
    -   **ドメインサービス (`NotionApiService`, `CacheService`, `MessageFormatterService`, `NotificationClient`, `templateMatcherService`, `EncryptionService`)**:
        -   `EncryptionService`: `UserNotionIntegration` のアクセストークンを暗号化・復号化する責務を持ちます。

-   **アプリケーション層 (Application Layer)**:
    -   アプリケーション固有のビジネスルール（ユースケース）を実装します。
    -   **ユースケース**:
        -   既存: `CreateTemplateUseCase`, `GetTemplateUseCase`, `ListTemplatesUseCase`, `UpdateTemplateUseCase`, `DeleteTemplateUseCase`, `CreateDestinationUseCase`, etc.
        -   新規: `CreateUserNotionIntegrationUseCase`, `ListUserNotionIntegrationsUseCase`, `DeleteUserNotionIntegrationUseCase`.
        -   `CreateTemplateUseCase` の変更点: ユーザーが提供した `userNotionIntegrationId` に基づいて `UserNotionIntegration` を取得し、そのトークンを使ってNotionデータベースへのアクセス権を検証（スキーマ取得）してからテンプレートを作成するようになりました。
        -   `ProcessNotionWebhookUseCase` の変更点: Webhook受信時、関連するテンプレート群から一つを選び、そのテンプレートに紐づく `UserNotionIntegration` のトークンを使ってNotionデータベーススキーマを取得するようになりました。これにより、グローバルなNotionトークンではなく、ユーザー固有のトークンでAPIアクセスが行われます。
    -   **DTO (Data Transfer Objects)**: ユースケースの入力・出力データ構造。
    -   **アプリケーションサービス (`MessageFormatterServiceImpl`など)**: ユースケースを補助するサービス。

-   **インフラストラクチャ層 (Infrastructure Layer)**:
    -   フレームワーク、ライブラリ、外部サービスへの具体的な実装詳細を扱います。
    -   **永続化実装 (`FirestoreTemplateRepository`, `FirestoreDestinationRepository`, `FirestoreUserNotionIntegrationRepository`, `InMemoryCacheService`など)**: Firestoreリポジトリは、ドメイン層の各リポジトリインターフェースを実装します。
    -   **Web クライアント (`NotionApiClient`, `HttpNotificationClient`など)**:
        -   `NotionApiClient`: 以前は単一のグローバルなNotionトークンで初期化されていましたが、現在はメソッド呼び出しごとにアクセストークンを引数として受け取るように変更されました。これにより、リクエストに応じて異なるユーザーのトークンを使用できます。
    -   **サービス実装 (`CryptoEncryptionService`)**: `EncryptionService`インターフェースを実装し、トークンの暗号化・復号化に`crypto`モジュールを使用します。
    -   **設定 (`docker-compose.yml`, `.env`など)**: `NOTION_TOKEN_ENCRYPTION_KEY` が追加されました。
    -   **認証基盤連携 (Firebase Admin SDK)**: 変更なし。

-   **プレゼンテーション層 (Presentation Layer)**:
    -   ユーザーや外部システムとのインターフェースを担当します。
    -   **Hono フレームワーク関連**:
        -   ルーティング定義 (`src/main.ts`): `/api/v1/me/notion-integrations` のための新しいルートが追加されました。
        -   リクエストハンドラ (`src/presentation/handlers/`): `userNotionIntegrationHandler.ts` が追加され、`templateHandler.ts` のテンプレート作成ハンドラは `userNotionIntegrationId` をリクエストボディから受け取るように変更されました。
    -   **認証ミドルウェア (`authMiddleware.ts`)**: 変更なし（引き続きFirebase IDトークンを検証）。
    -   リクエストを受け取り、適切なアプリケーション層のユースケースに処理を委譲し、ユースケースからの結果を HTTP レスポンスとして返します。

## 主要なデータの流れ

### 主要なデータの流れ (ユーザー認証を伴うAPI呼び出しの例 - 例: テンプレート作成)

1.  **リクエスト受信**: クライアントから、IDトークンをヘッダーに含め、`userNotionIntegrationId`を含むリクエストボディでテンプレート作成API (`POST /api/v1/templates`) へのリクエストが送信されます。
2.  **認証ミドルウェア実行**: 変更なし。
3.  **ハンドラ処理**: `TemplateHandler`がリクエストボディ（`userNotionIntegrationId`を含む）とコンテキスト内の`userId`を取得し、`CreateTemplateInput` DTOを組み立てます。
4.  **ユースケース実行 (`CreateTemplateUseCase`)**:
    a.  `UserNotionIntegrationRepository` を使用して、`input.userNotionIntegrationId` と `input.userId` に基づいて `UserNotionIntegration` を取得します。見つからない、またはユーザーに属さない場合はエラー。
    b.  `EncryptionService` を使用して、取得したインテグレーションの `encryptedNotionIntegrationToken` を復号します。
    c.  復号したトークンと `input.notionDatabaseId` を使用して `NotionApiService` (実装: `NotionApiClient`) の `getDatabaseSchema` を呼び出し、データベースへのアクセス権限を検証します。スキーマが取得できない（権限がない、DBが存在しない等）場合はエラー。
    d.  検証成功後、`Template`エンティティ（`userNotionIntegrationId`を含む）を生成します。
    e.  `TemplateRepository` を介して`Template`エンティティをFirestoreに保存します。
5.  **レスポンス返却**: 保存されたテンプレート情報（`userNotionIntegrationId`を含むDTO）がクライアントに返却されます。

### 主要なデータの流れ (Webhook 処理の例)

1.  **Webhook 受信**: 変更なし。
2.  **ユースケース実行 (`ProcessNotionWebhookUseCase`)**: 変更なし。
3.  **情報抽出・テンプレート群取得**: `ProcessNotionWebhookUseCase`は`databaseId`を抽出し、`TemplateRepository` を使用して該当`databaseId`の**全ての**テンプレート (`allTemplatesForDb`) を取得します。
4.  **トークン取得とスキーマ取得**:
    a.  ユースケースは `allTemplatesForDb` をイテレートし、いずれかのテンプレートに関連付けられた `userNotionIntegrationId` と `userId` を見つけます。
    b.  `UserNotionIntegrationRepository` を使って該当する `UserNotionIntegration` を取得します。
    c.  `EncryptionService` でそのインテグレーションのトークンを復号します。
    d.  復号したトークンを使って `NotionApiService` (実装: `NotionApiClient`) の `getDatabaseSchema` を呼び出し、データベーススキーマを取得します。
    e.  有効なトークンが見つからない、またはスキーマが取得できない場合はエラー処理。
5.  **条件照合**: `templateMatcherService`が、受信したページプロパティ、`allTemplatesForDb`（全てのテンプレート）、および取得したデータベーススキーマを元に、条件に一致するテンプレートを特定します。
6.  **メッセージ整形**: 変更なし。
7.  **送信先取得・通知送信**: 変更なし。

## セキュリティに関する考慮事項

-   **Notionアクセストークンの保護**: ユーザーが登録したNotionインテグレーションのアクセストークンは、`EncryptionService`（`CryptoEncryptionService`実装）によってアプリケーションデータベース（Firestore）に保存される前にAES-256-GCMなどの強力なアルゴリズムで暗号化されます。暗号化キー（`NOTION_TOKEN_ENCRYPTION_KEY`）は環境変数として安全に管理され、リポジトリには含まれません。
-   **認証・認可**: Firebase AuthenticationによるIDトークン検証は、全ての保護されたAPIエンドポイントへのアクセスを制御します。リソースへのアクセスは、エンティティに格納された`userId`に基づいて認可され、ユーザーは自身のデータのみを操作できます。

このアーキテクチャにより、各コンポーネントの責務が明確になり、柔軟で保守性の高いアプリケーションを目指しています。
