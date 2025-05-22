// src/main.ts
import { Hono } from "hono";

// --- Domain層のインポート ---
import type { TemplateRepository } from "./domain/repositories/templateRepository";
import type { DestinationRepository } from "./domain/repositories/destinationRepository";
import type { NotionApiService } from "./domain/services/notionApiService";
import type { CacheService } from "./application/services/cacheService"; // CacheServiceインターフェースも定義したと仮定

// --- Application層 (UseCases) のインポート ---
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

// --- Infrastructure層 (具体的な実装) のインポート ---
import { InMemoryTemplateRepository } from "./infrastructure/persistence/inMemory/inMemoryTemplateRepository";
import { FirestoreTemplateRepository } from "./infrastructure/persistence/firestore/firestoreTemplateRepository";
// import { InMemoryDestinationRepository } from "./infrastructure/persistence/inMemory/inMemoryDestinationRepository"; // もし作るなら
import { FirestoreDestinationRepository } from "./infrastructure/persistence/firestore/firestoreDestinationRepository";
import { NotionApiClient } from "./infrastructure/web-clients/notionApiClient";
import { InMemoryCacheService } from "./infrastructure/cache/inMemoryCacheService"; // InMemoryCacheService をインポート (別ファイルにある想定)

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

const app = new Hono();

// --- DIのセットアップ ---
const USE_FIRESTORE_DB = true; // Firestoreを使うかどうかのフラグ (環境変数で制御するのが望ましい)

// Environment Variables
const notionIntegrationToken = process.env.NOTION_INTEGRATION_TOKEN;
const googleAppCredentials = process.env.GOOGLE_APPLICATION_CREDENTIALS; // docker-compose.ymlで設定

if (!notionIntegrationToken) {
	const errorMessage =
		"FATAL ERROR: NOTION_INTEGRATION_TOKEN environment variable is not set.";
	console.error(errorMessage);
	throw new Error(errorMessage);
}
if (USE_FIRESTORE_DB && !googleAppCredentials) {
	// Firestoreを使う場合は、サービスアカウントキーのパスも必須
	const errorMessage =
		"FATAL ERROR: GOOGLE_APPLICATION_CREDENTIALS environment variable is not set, but USE_FIRESTORE_DB is true.";
	console.error(errorMessage);
	throw new Error(errorMessage);
}

// Repositories and Services
let templateRepository: TemplateRepository;
let destinationRepository: DestinationRepository;
const cacheService: CacheService = new InMemoryCacheService(); // まずはインメモリキャッシュを使用
const notionApiService: NotionApiService = new NotionApiClient(
	notionIntegrationToken,
	cacheService,
); // CacheServiceを注入

let persistenceTypeMessage: string;

if (USE_FIRESTORE_DB) {
	templateRepository = new FirestoreTemplateRepository();
	destinationRepository = new FirestoreDestinationRepository();
	persistenceTypeMessage = "Persistence: Firestore";
} else {
	templateRepository = new InMemoryTemplateRepository();
	// destinationRepository = new InMemoryDestinationRepository(); // 必要ならこちらも実装
	// 今回はFirestore固定に近い形で進めているので、else側はエラーにするか、
	// InMemoryDestinationRepositoryもちゃんと実装する必要がある。
	// ここでは、Templateだけインメモリで、Destinationは未実装と仮定してエラーを投げる。
	throw new Error(
		"InMemoryDestinationRepository is not implemented for this fallback scenario.",
	);
	// persistenceTypeMessage = "Persistence: InMemory";
}

// UseCaseのインスタンス化
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
);

// --- ルーティング定義 ---
const apiV1 = new Hono(); // /api/v1 のベースパス用の新しいHonoインスタンス

// Template API routes
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

// Destination API routes
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

// メインのappに /api/v1 ルートを結合
app.route("/api/v1", apiV1);

// Notion Webhook route (これは /api/v1 の外に置くことが多い)
app.post(
	"/webhooks/notion",
	notionWebhookHandlerFactory(processNotionWebhookUseCase),
);

// Root path
app.get("/", (c) => {
	return c.text("Notifier App is running!");
});

export default {
	port: 3000,
	fetch: app.fetch,
};

console.log("Notifier app is running on port 3000");
if (process.env.NODE_ENV !== "production") {
	console.log(persistenceTypeMessage);
}
