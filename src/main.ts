// src/main.ts
import { Hono } from "hono";

// Firebase Admin SDK関連のimport
import { initializeApp, cert, getApps } from "firebase-admin/app";

// --- Domain層のインポート ---
import type { TemplateRepository } from "./domain/repositories/templateRepository";
import type { DestinationRepository } from "./domain/repositories/destinationRepository";
import type { NotionApiService } from "./domain/services/notionApiService";
import type { CacheService } from "./application/services/cacheService";
import type { MessageFormatterService } from "./domain/services/messageFormatterService";
import type { NotificationClient } from "./domain/services/notificationClient";

// --- Application層 (UseCases & Services) のインポート ---
import { CreateTemplateUseCase } from "./application/usecases/createTemplateUseCase";
import { GetTemplateUseCase } from "./application/usecases/getTemplateUseCase";
import { ListTemplatesUseCase } from "./application/usecases/listTemplatesUseCase";
import { UpdateTemplateUseCase } from "./application/usecases/updateTemplateUseCase";
import { DeleteTemplateUseCase } from "./application/usecases/deleteTemplateUseCase";

import { CreateDestinationUseCase } from "./application/usecases/createDestinationUseCase";
import { GetDestinationUseCase } from "./application/usecases/getDestinationUseCase";
import { ListDestinationsUseCase } from "./application/usecases/listDestinationsUseCase";
import { UpdateDestinationUseCase } from "./application/usecases/updateDestinationUseCase";
import { DeleteDestinationUseCase } from "./application/usecases/deleteDestinationUseCase";

import { ProcessNotionWebhookUseCase } from "./application/usecases/processNotionWebhookUseCase";
import { MessageFormatterServiceImpl } from "./application/services/messageFormatterServiceImpl";

// --- Infrastructure層 (具体的な実装) のインポート ---
import { InMemoryTemplateRepository } from "./infrastructure/persistence/inMemory/inMemoryTemplateRepository";
import { FirestoreTemplateRepository } from "./infrastructure/persistence/firestore/firestoreTemplateRepository";
// import { InMemoryDestinationRepository } from "./infrastructure/persistence/inMemory/inMemoryDestinationRepository";
import { FirestoreDestinationRepository } from "./infrastructure/persistence/firestore/firestoreDestinationRepository";
import { NotionApiClient } from "./infrastructure/web-clients/notionApiClient";
import { InMemoryCacheService } from "./infrastructure/persistence/inMemory/inMemoryCacheService";
import { HttpNotificationClient } from "./infrastructure/web-clients/httpNotificationClient";

// --- Presentation層 (Handlers) のインポート ---
import {
	createTemplateHandlerFactory,
	getTemplateByIdHandlerFactory,
	listTemplatesHandlerFactory,
	updateTemplateHandlerFactory,
	deleteTemplateHandlerFactory,
} from "./presentation/handlers/templateHandler";
import {
	createDestinationHandlerFactory,
	getDestinationByIdHandlerFactory,
	listDestinationsHandlerFactory,
	updateDestinationHandlerFactory,
	deleteDestinationHandlerFactory,
} from "./presentation/handlers/destinationHandler";
import { notionWebhookHandlerFactory } from "./presentation/handlers/notionWebhookHandler";

// ★★★ 認証ミドルウェアをインポート ★★★
import { authMiddleware } from "./presentation/middleware/authMiddleware"; // パスは実際の場所に合わせてな

// --- Domain層のインポート (UserNotionIntegration) ---
import type { UserNotionIntegrationRepository } from "./domain/repositories/userNotionIntegrationRepository";
import type { EncryptionService } from "./domain/services/encryptionService";

// --- Application層 (UseCases - UserNotionIntegration) のインポート ---
import { CreateUserNotionIntegrationUseCase } from "./application/usecases/createUserNotionIntegrationUseCase";
import { ListUserNotionIntegrationsUseCase } from "./application/usecases/listUserNotionIntegrationsUseCase";
import { DeleteUserNotionIntegrationUseCase } from "./application/usecases/deleteUserNotionIntegrationUseCase";

// --- Infrastructure層 (UserNotionIntegration) のインポート ---
import { CryptoEncryptionService } from "./infrastructure/services/cryptoEncryptionService";
import { FirestoreUserNotionIntegrationRepository } from "./infrastructure/persistence/firestore/firestoreUserNotionIntegrationRepository";
import { getFirestore } from "firebase-admin/firestore"; // Firestoreインスタンス取得用

// --- Presentation層 (Handlers - UserNotionIntegration) のインポート ---
import {
	createUserNotionIntegrationHandlerFactory,
	listUserNotionIntegrationsHandlerFactory,
	deleteUserNotionIntegrationHandlerFactory,
} from "./presentation/handlers/userNotionIntegrationHandler";

const app = new Hono();

// --- 定数定義 ---
const USE_FIRESTORE_DB = true;

// --- Firebase Admin SDK の初期化 ---
let db: FirebaseFirestore.Firestore; // dbをここで宣言
if (USE_FIRESTORE_DB && process.env.NODE_ENV !== "test") {
	if (!getApps().length) {
		const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
		if (!serviceAccountPath) {
			const errorMessage =
				"FATAL ERROR: GOOGLE_APPLICATION_CREDENTIALS environment variable is not set, but Firestore is configured and Firebase is not initialized.";
			console.error(errorMessage);
			throw new Error(errorMessage);
		}
		try {
			initializeApp({
				credential: cert(serviceAccountPath),
			});
			console.log("Firebase Admin SDK initialized centrally in main.ts.");
		} catch (e: unknown) {
			// より汎用的なエラーキャッチ
			const errorMessage = e instanceof Error ? e.message : String(e);
			console.error("Failed to initialize Firebase Admin SDK:", errorMessage);
			throw new Error(
				`Firebase Admin SDK initialization failed: ${errorMessage}`,
			);
		}
	}
	db = getFirestore(); // 初期化後にdbを取得
	console.log("Firestore instance obtained.");
} else if (USE_FIRESTORE_DB && process.env.NODE_ENV === "test") {
	// Test environment with Firestore, potentially use emulators or specific test setup
	// For now, let's assume it might need a mock or specific test instance of db
	console.warn("Firestore is configured for test environment. Ensure DB is correctly mocked or connected to emulator.");
	// db = getFirestore(); // Or your test specific firestore instance
}


// --- 環境変数のチェック ---
const notionIntegrationToken = process.env.NOTION_INTEGRATION_TOKEN;
if (!notionIntegrationToken) {
	const errorMessage =
		"FATAL ERROR: NOTION_INTEGRATION_TOKEN environment variable is not set.";
	console.error(errorMessage);
	throw new Error(errorMessage);
}
const notionTokenEncryptionKey = process.env.NOTION_TOKEN_ENCRYPTION_KEY;
if (!notionTokenEncryptionKey) {
    const errorMessage = "FATAL ERROR: NOTION_TOKEN_ENCRYPTION_KEY environment variable is not set.";
    console.error(errorMessage);
    throw new Error(errorMessage);
}


// --- DIのセットアップ ---
let templateRepository: TemplateRepository;
let destinationRepository: DestinationRepository;
const cacheService: CacheService = new InMemoryCacheService();
const notionApiService: NotionApiService = new NotionApiClient(
	notionIntegrationToken,
	cacheService,
);
const messageFormatterService: MessageFormatterService =
	new MessageFormatterServiceImpl();
const notificationClient: NotificationClient = new HttpNotificationClient();

// UserNotionIntegration related services and repositories
let userNotionIntegrationRepository: UserNotionIntegrationRepository;
const encryptionService: EncryptionService = new CryptoEncryptionService(); // No key in constructor

let persistenceTypeMessage: string;

if (USE_FIRESTORE_DB) {
	if (!db) throw new Error("Firestore (db) is not initialized but USE_FIRESTORE_DB is true.");
	templateRepository = new FirestoreTemplateRepository(db); // Pass db
	destinationRepository = new FirestoreDestinationRepository(db); // Pass db
	userNotionIntegrationRepository = new FirestoreUserNotionIntegrationRepository(db, encryptionService); // Pass db
	persistenceTypeMessage = "Persistence: Firestore";
} else {
	templateRepository = new InMemoryTemplateRepository();
	// destinationRepository = new InMemoryDestinationRepository(); // Assuming you'd have this
	userNotionIntegrationRepository = {} as UserNotionIntegrationRepository; // Placeholder for non-Firestore setup
	throw new Error(
		"InMemoryDestinationRepository or InMemoryUserNotionIntegrationRepository is not implemented for this fallback scenario, or USE_FIRESTORE_DB is unexpectedly false.",
	);
}

// --- ユースケースのインスタンス化 ---
const createTemplateUseCase = new CreateTemplateUseCase(templateRepository);
const getTemplateUseCase = new GetTemplateUseCase(templateRepository);
const listTemplatesUseCase = new ListTemplatesUseCase(templateRepository);
const updateTemplateUseCase = new UpdateTemplateUseCase(templateRepository);
const deleteTemplateUseCase = new DeleteTemplateUseCase(templateRepository);

const createDestinationUseCase = new CreateDestinationUseCase(
	destinationRepository,
);
const getDestinationUseCase = new GetDestinationUseCase(destinationRepository);
const listDestinationsUseCase = new ListDestinationsUseCase(
	destinationRepository,
);
const updateDestinationUseCase = new UpdateDestinationUseCase(
	destinationRepository,
);
const deleteDestinationUseCase = new DeleteDestinationUseCase(
	destinationRepository,
);

const processNotionWebhookUseCase = new ProcessNotionWebhookUseCase(
	templateRepository,
	destinationRepository,
	notionApiService,
	messageFormatterService,
	notificationClient,
);

// UserNotionIntegration UseCases
const createUserNotionIntegrationUseCase = new CreateUserNotionIntegrationUseCase(
	userNotionIntegrationRepository,
	encryptionService,
);
const listUserNotionIntegrationsUseCase = new ListUserNotionIntegrationsUseCase(
	userNotionIntegrationRepository,
);
const deleteUserNotionIntegrationUseCase = new DeleteUserNotionIntegrationUseCase(
	userNotionIntegrationRepository,
);


// --- ハンドラのインスタンス化 ---
const createUserNotionIntegrationHandler = createUserNotionIntegrationHandlerFactory(createUserNotionIntegrationUseCase);
const listUserNotionIntegrationsHandler = listUserNotionIntegrationsHandlerFactory(listUserNotionIntegrationsUseCase);
const deleteUserNotionIntegrationHandler = deleteUserNotionIntegrationHandlerFactory(deleteUserNotionIntegrationUseCase);


// --- ルーティング定義 ---
const apiV1 = new Hono();

// ★★★ /api/v1 のルートグループ全体に認証ミドルウェアを適用 ★★★
apiV1.use("*", authMiddleware); // Apply to all /api/v1 routes (Restored)

// Template API
apiV1.post("/templates", createTemplateHandlerFactory(createTemplateUseCase));
apiV1.get("/templates/:id", getTemplateByIdHandlerFactory(getTemplateUseCase));
apiV1.get("/templates", listTemplatesHandlerFactory(listTemplatesUseCase));
apiV1.put(
	"/templates/:id",
	updateTemplateHandlerFactory(updateTemplateUseCase),
);
apiV1.delete(
	"/templates/:id",
	deleteTemplateHandlerFactory(deleteTemplateUseCase),
);

// Destination API
apiV1.post(
	"/destinations",
	createDestinationHandlerFactory(createDestinationUseCase),
);
apiV1.get(
	"/destinations/:id",
	getDestinationByIdHandlerFactory(getDestinationUseCase),
);
apiV1.get(
	"/destinations",
	listDestinationsHandlerFactory(listDestinationsUseCase),
);
apiV1.put(
	"/destinations/:id",
	updateDestinationHandlerFactory(updateDestinationUseCase),
);
apiV1.delete(
	"/destinations/:id",
	deleteDestinationHandlerFactory(deleteDestinationUseCase),
);

// User Notion Integrations API (/api/v1/me/notion-integrations)
// These routes will also be covered by apiV1.use("*", authMiddleware)
const meNotionIntegrationsApp = new Hono();
meNotionIntegrationsApp.post("/", createUserNotionIntegrationHandler); // Path relative to /api/v1/me/notion-integrations
meNotionIntegrationsApp.get("/", listUserNotionIntegrationsHandler); // Path relative to /api/v1/me/notion-integrations
meNotionIntegrationsApp.delete("/:integrationId", deleteUserNotionIntegrationHandler); // Path relative to /api/v1/me/notion-integrations

apiV1.route("/me/notion-integrations", meNotionIntegrationsApp); // Mount point

app.route("/api/v1", apiV1);

// Webhook Endpoint (認証ミドルウェアの対象外)
app.post(
	"/webhooks/notion",
	notionWebhookHandlerFactory(processNotionWebhookUseCase),
);

// Root Endpoint (認証不要)
app.get("/", (c) => c.text("Notifier App is running!"));

export default {
	port: process.env.PORT || 3000,
	fetch: app.fetch,
	app: app, // Exporting the app instance itself for potential testing or other uses
};

console.log(`Notifier app is running on port ${process.env.PORT || 3000}`);
if (process.env.NODE_ENV !== "production") {
	console.log(persistenceTypeMessage);
}
