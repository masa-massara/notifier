// src/main.ts
import { Hono } from "hono";

// Firebase Admin SDK関連のimport
import { initializeApp, cert, getApps } from "firebase-admin/app";

// --- Domain層のインポート ---
import type { TemplateRepository } from "./domain/repositories/templateRepository";
import type { DestinationRepository } from "./domain/repositories/destinationRepository";
import type { UserNotionIntegrationRepository } from "./domain/repositories/userNotionIntegrationRepository"; // Added
import type { NotionApiService } from "./domain/services/notionApiService";
import type { CacheService } from "./application/services/cacheService";
import type { EncryptionService } from "./application/services/encryptionService"; // Added
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

// UserNotionIntegration UseCases
import { CreateUserNotionIntegrationUseCase } from "./application/usecases/createUserNotionIntegrationUseCase"; // Added
import { ListUserNotionIntegrationsUseCase } from "./application/usecases/listUserNotionIntegrationsUseCase"; // Added
import { DeleteUserNotionIntegrationUseCase } from "./application/usecases/deleteUserNotionIntegrationUseCase"; // Added

import { ProcessNotionWebhookUseCase } from "./application/usecases/processNotionWebhookUseCase";
import { MessageFormatterServiceImpl } from "./application/services/messageFormatterServiceImpl";

// --- Infrastructure層 (具体的な実装) のインポート ---
import { InMemoryTemplateRepository } from "./infrastructure/persistence/inMemory/inMemoryTemplateRepository";
import { FirestoreTemplateRepository } from "./infrastructure/persistence/firestore/firestoreTemplateRepository";
// import { InMemoryDestinationRepository } from "./infrastructure/persistence/inMemory/inMemoryDestinationRepository";
import { FirestoreDestinationRepository } from "./infrastructure/persistence/firestore/firestoreDestinationRepository";
import { FirestoreUserNotionIntegrationRepository } from "./infrastructure/persistence/firestore/firestoreUserNotionIntegrationRepository"; // Added
import { NodeCryptoEncryptionService } from "./infrastructure/services/nodeCryptoEncryptionService"; // Added
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
import { createUserNotionIntegrationHandlers } from "./presentation/handlers/userNotionIntegrationHandler"; // Added

// ★★★ 認証ミドルウェアをインポート ★★★
import { authMiddleware } from "./presentation/middleware/authMiddleware"; // パスは実際の場所に合わせてな

const app = new Hono();

// --- 定数定義 ---
const USE_FIRESTORE_DB = true;

// --- Firebase Admin SDK の初期化 ---
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
}

// --- 環境変数のチェック ---
const encryptionKey = process.env.ENCRYPTION_KEY;
if (!encryptionKey) {
	const errorMessage =
		"FATAL ERROR: ENCRYPTION_KEY environment variable is not set.";
	console.error(errorMessage);
	throw new Error(errorMessage);
}

// --- DIのセットアップ ---
let templateRepository: TemplateRepository;
let destinationRepository: DestinationRepository;
let userNotionIntegrationRepository: UserNotionIntegrationRepository; // Added

const cacheService: CacheService = new InMemoryCacheService();
const notionApiService: NotionApiService = new NotionApiClient(cacheService); // notionIntegrationToken removed
const encryptionService: EncryptionService = new NodeCryptoEncryptionService(encryptionKey); // Added
const messageFormatterService: MessageFormatterService =
	new MessageFormatterServiceImpl();
const notificationClient: NotificationClient = new HttpNotificationClient();

let persistenceTypeMessage: string;

if (USE_FIRESTORE_DB) {
	templateRepository = new FirestoreTemplateRepository();
	destinationRepository = new FirestoreDestinationRepository();
	userNotionIntegrationRepository = new FirestoreUserNotionIntegrationRepository(new (require('@google-cloud/firestore').Firestore)()); // Added
	persistenceTypeMessage = "Persistence: Firestore";
} else {
	templateRepository = new InMemoryTemplateRepository();
	// TODO: Implement InMemoryUserNotionIntegrationRepository if needed for non-Firestore environments
	throw new Error(
		"InMemoryDestinationRepository and/or InMemoryUserNotionIntegrationRepository are not implemented for this fallback scenario, or USE_FIRESTORE_DB is unexpectedly false.",
	);
}

// --- ユースケースのインスタンス化 ---
const createTemplateUseCase = new CreateTemplateUseCase(
	templateRepository,
	userNotionIntegrationRepository, // Added
	notionApiService, // Added
	encryptionService, // Added
);
const getTemplateUseCase = new GetTemplateUseCase(templateRepository);
const listTemplatesUseCase = new ListTemplatesUseCase(templateRepository);
const updateTemplateUseCase = new UpdateTemplateUseCase(
	templateRepository,
	userNotionIntegrationRepository, // Added
	notionApiService, // Added
	encryptionService, // Added
);
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

// UserNotionIntegration UseCases Instantiation
const createUserNotionIntegrationUseCase = new CreateUserNotionIntegrationUseCase(userNotionIntegrationRepository, encryptionService); // Added
const listUserNotionIntegrationsUseCase = new ListUserNotionIntegrationsUseCase(userNotionIntegrationRepository); // Added
const deleteUserNotionIntegrationUseCase = new DeleteUserNotionIntegrationUseCase(userNotionIntegrationRepository); // Added

const processNotionWebhookUseCase = new ProcessNotionWebhookUseCase(
	templateRepository,
	destinationRepository,
	notionApiService,
	messageFormatterService,
	notificationClient,
	userNotionIntegrationRepository, // Added
	encryptionService, // Added
);

// --- ルーティング定義 ---
const apiV1 = new Hono();

// ★★★ /api/v1 のルートグループ全体に認証ミドルウェアを適用 ★★★
apiV1.use("*", authMiddleware);

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

// User Notion Integration API
const userNotionIntegrationHandlers = createUserNotionIntegrationHandlers(
	createUserNotionIntegrationUseCase,
	listUserNotionIntegrationsUseCase,
	deleteUserNotionIntegrationUseCase,
); // Added

const userNotionIntegrationApi = new Hono(); // Added
userNotionIntegrationApi.post("/", userNotionIntegrationHandlers.createIntegrationHandler); // Added
userNotionIntegrationApi.get("/", userNotionIntegrationHandlers.listIntegrationsHandler); // Added
userNotionIntegrationApi.delete("/:integrationId", userNotionIntegrationHandlers.deleteIntegrationHandler); // Added

apiV1.route("/me/notion-integrations", userNotionIntegrationApi); // Added

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
};

console.log(`Notifier app is running on port ${process.env.PORT || 3000}`);
if (process.env.NODE_ENV !== "production" && persistenceTypeMessage) {
	console.log(persistenceTypeMessage);
}
