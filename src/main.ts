// src/main.ts
import { Hono } from "hono";

// Firebase Admin SDK関連のimport
import { initializeApp, cert, getApps, App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore"; // Static import for Firestore

// --- Domain層のインポート ---
import type { TemplateRepository } from "./domain/repositories/templateRepository";
import type { DestinationRepository } from "./domain/repositories/destinationRepository";
import type { UserNotionIntegrationRepository } from "./domain/repositories/userNotionIntegrationRepository";
import type { NotionApiService } from "./domain/services/notionApiService";
import type { CacheService } from "./application/services/cacheService";
import type { EncryptionService } from "./application/services/encryptionService";
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
import { CreateUserNotionIntegrationUseCase } from "./application/usecases/createUserNotionIntegrationUseCase";
import { ListUserNotionIntegrationsUseCase } from "./application/usecases/listUserNotionIntegrationsUseCase";
import { DeleteUserNotionIntegrationUseCase } from "./application/usecases/deleteUserNotionIntegrationUseCase";
import { ListNotionDatabasesUseCase } from "./application/usecases/listNotionDatabasesUseCase";
// ADD IMPORT FOR THE NEW USE CASE
import { GetNotionDatabasePropertiesUseCase } from "./application/usecases/getNotionDatabasePropertiesUseCase";


import { ProcessNotionWebhookUseCase } from "./application/usecases/processNotionWebhookUseCase";
import { MessageFormatterServiceImpl } from "./application/services/messageFormatterServiceImpl";

// --- Infrastructure層 (具体的な実装) のインポート ---
// ... (keep existing infrastructure imports)
import { InMemoryTemplateRepository } from "./infrastructure/persistence/inMemory/inMemoryTemplateRepository";
import { FirestoreTemplateRepository } from "./infrastructure/persistence/firestore/firestoreTemplateRepository";
import { FirestoreDestinationRepository } from "./infrastructure/persistence/firestore/firestoreDestinationRepository";
import { FirestoreUserNotionIntegrationRepository } from "./infrastructure/persistence/firestore/firestoreUserNotionIntegrationRepository";
import { NodeCryptoEncryptionService } from "./infrastructure/services/nodeCryptoEncryptionService";
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
import { createUserNotionIntegrationHandlers } from "./presentation/handlers/userNotionIntegrationHandler";
// ADD IMPORT FOR THE NEW HANDLER FACTORY
import { getNotionDatabasePropertiesHandlerFactory } from "./presentation/handlers/notionDatabaseHandler";

import { authMiddleware } from "./presentation/middleware/authMiddleware";

import "hono";
import { cors } from "hono/cors";

declare module "hono" {
	interface ContextVariableMap {
		userId: string;
	}
}

const app = new Hono<{ Variables: { userId: string } }>();

app.use(
	"*",
	cors({
		origin: [
			"http://localhost:3000",
			"http://localhost:3001",
		],
		allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
		allowHeaders: ["Content-Type", "Authorization"],
		credentials: true,
	}),
);

const USE_FIRESTORE_DB = true;

// --- Firebase Admin SDK Initialization ---
// ... (keep existing Firebase init logic)
if (USE_FIRESTORE_DB && process.env.NODE_ENV !== "test") {
	if (!getApps().length) {
		const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
		try {
			if (serviceAccountPath) {
				console.log(
					`Initializing Firebase Admin SDK with service account from: ${serviceAccountPath}`,
				);
				initializeApp({
					credential: cert(serviceAccountPath),
				});
			} else {
				console.log(
					"Initializing Firebase Admin SDK with default credentials (runtime service account).",
				);
				initializeApp();
			}
			console.log("Firebase Admin SDK initialized centrally in main.ts.");
		} catch (e: unknown) {
			const errorMessageText = e instanceof Error ? e.message : String(e);
			console.error(
				"Failed to initialize Firebase Admin SDK:",
				errorMessageText,
			);
			throw new Error(
				`Firebase Admin SDK initialization failed: ${errorMessageText}`,
			);
		}
	} else {
		console.log("Firebase Admin SDK already initialized.");
	}
}


// --- Environment Variable Checks ---
// ... (keep existing env var checks)
const encryptionKey = process.env.ENCRYPTION_KEY;
if (!encryptionKey) {
	const errorMessage =
		"FATAL ERROR: ENCRYPTION_KEY environment variable is not set.";
	console.error(errorMessage);
	throw new Error(errorMessage);
}


// --- DI Setup ---
// ... (keep existing DI setup for repositories and services)
let templateRepository: TemplateRepository;
let destinationRepository: DestinationRepository;
let userNotionIntegrationRepository: UserNotionIntegrationRepository;

const cacheService: CacheService = new InMemoryCacheService();
const notionApiService: NotionApiService = new NotionApiClient(cacheService);
const encryptionService: EncryptionService = new NodeCryptoEncryptionService(
	encryptionKey,
);
const messageFormatterService: MessageFormatterService =
	new MessageFormatterServiceImpl();
const notificationClient: NotificationClient = new HttpNotificationClient();

let persistenceTypeMessage: string;

if (USE_FIRESTORE_DB) {
	templateRepository = new FirestoreTemplateRepository();
	destinationRepository = new FirestoreDestinationRepository();
	userNotionIntegrationRepository =
		new FirestoreUserNotionIntegrationRepository(getFirestore());
	persistenceTypeMessage = "Persistence: Firestore";
} else {
	templateRepository = new InMemoryTemplateRepository();
	throw new Error(
		"InMemoryDestinationRepository and/or InMemoryUserNotionIntegrationRepository are not implemented for this fallback scenario, or USE_FIRESTORE_DB is unexpectedly false.",
	);
}


// --- ユースケースのインスタンス化 ---
// ... (keep existing use case instantiations)
const createTemplateUseCase = new CreateTemplateUseCase(
	templateRepository,
	userNotionIntegrationRepository,
	notionApiService,
	encryptionService,
);
const getTemplateUseCase = new GetTemplateUseCase(templateRepository);
const listTemplatesUseCase = new ListTemplatesUseCase(templateRepository);
const updateTemplateUseCase = new UpdateTemplateUseCase(
	templateRepository,
	userNotionIntegrationRepository,
	notionApiService,
	encryptionService,
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

const createUserNotionIntegrationUseCase =
	new CreateUserNotionIntegrationUseCase(
		userNotionIntegrationRepository,
		encryptionService,
	);
const listUserNotionIntegrationsUseCase = new ListUserNotionIntegrationsUseCase(
	userNotionIntegrationRepository,
);
const deleteUserNotionIntegrationUseCase =
	new DeleteUserNotionIntegrationUseCase(userNotionIntegrationRepository);

const listNotionDatabasesUseCase = new ListNotionDatabasesUseCase(
    userNotionIntegrationRepository,
    encryptionService,
    notionApiService,
);

// INSTANTIATE THE NEW GetNotionDatabasePropertiesUseCase
const getNotionDatabasePropertiesUseCase = new GetNotionDatabasePropertiesUseCase(
    userNotionIntegrationRepository,
    encryptionService,
    notionApiService,
    cacheService, // Make sure cacheService is passed
);

const processNotionWebhookUseCase = new ProcessNotionWebhookUseCase(
	templateRepository,
	destinationRepository,
	notionApiService,
	messageFormatterService,
	notificationClient,
	userNotionIntegrationRepository,
	encryptionService,
);

// --- ルーティング定義 ---
const apiV1 = new Hono<{ Variables: { userId: string } }>();
apiV1.use("*", authMiddleware);

// Template API
// ... (keep existing template API routes)
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
// ... (keep existing destination API routes)
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
    listNotionDatabasesUseCase,
);

const userNotionIntegrationApi = new Hono<{ Variables: { userId: string } }>();
userNotionIntegrationApi.post(
	"/",
	userNotionIntegrationHandlers.createIntegrationHandler,
);
userNotionIntegrationApi.get(
	"/",
	userNotionIntegrationHandlers.listIntegrationsHandler,
);
userNotionIntegrationApi.delete(
	"/:integrationId",
	userNotionIntegrationHandlers.deleteIntegrationHandler,
);
userNotionIntegrationApi.get(
    "/:integrationId/databases",
    userNotionIntegrationHandlers.listUserAccessibleDatabasesHandler,
);
apiV1.route("/me/notion-integrations", userNotionIntegrationApi);


// INSTANTIATE THE NEW HANDLER
const getNotionDatabasePropertiesHandler = getNotionDatabasePropertiesHandlerFactory(getNotionDatabasePropertiesUseCase);

// ADD THE NEW ROUTE TO apiV1
apiV1.get(
    "/notion-databases/:databaseId/properties",
    getNotionDatabasePropertiesHandler,
);


app.route("/api/v1", apiV1);

// Webhook Endpoint
// ... (keep existing webhook route)
app.post(
	"/webhooks/notion",
	notionWebhookHandlerFactory(processNotionWebhookUseCase),
);


// Root Endpoint
// ... (keep existing root route)
app.get("/", (c) => c.text("Notifier App is running!"));


export default {
	port: process.env.PORT || 3000,
	fetch: app.fetch,
};

console.log(`Notifier app is running on port ${process.env.PORT || 3000}`);
if (process.env.NODE_ENV !== "production" && persistenceTypeMessage) {
	console.log(persistenceTypeMessage);
}
