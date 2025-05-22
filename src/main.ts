// src/main.ts
import { Hono } from "hono";
import { CreateTemplateUseCase } from "./application/usecases/createTemplateUseCase";
import { InMemoryTemplateRepository } from "./infrastructure/persistence/inMemory/inMemoryTemplateRepository";
import { FirestoreTemplateRepository } from "./infrastructure/persistence/firestore/firestoreTemplateRepository";
import {
	createTemplateHandlerFactory,
	deleteTemplateHandlerFactory,
	listTemplatesHandlerFactory,
	updateTemplateHandlerFactory,
} from "./presentation/handlers/templateHandler";
import type { TemplateRepository } from "./domain/repositories/templateRepository"; // TemplateRepository は型としてインポート
import { GetTemplateUseCase } from "./application/usecases/getTemplateUseCase"; // 新しいユースケース
import { getTemplateByIdHandlerFactory } from "./presentation/handlers/templateHandler"; // 新しいハンドラファクトリ
import { ListTemplatesUseCase } from "./application/usecases/listTemplatesUseCase";
import { UpdateTemplateUseCase } from "./application/usecases/updateTemplateUseCase";
import { DeleteTemplateUseCase } from "./application/usecases/deleteTemplateUseCase";

import type { DestinationRepository } from "./domain/repositories/destinationRepository"; // DestinationRepositoryインターフェース
import { CreateDestinationUseCase } from "./application/usecases/createDestinationUseCase"; // Destination用ユースケース
import { FirestoreDestinationRepository } from "./infrastructure/persistence/firestore/firestoreDestinationRepository"; // Firestore実装
import {
	createDestinationHandlerFactory,
	deleteDestinationHandlerFactory,
	updateDestinationHandlerFactory,
} from "./presentation/handlers/destinationHandler"; // Destination用ハンドラ

import { GetDestinationUseCase } from "./application/usecases/getDestinationUseCase"; // Destination用GETユースケース
import { getDestinationByIdHandlerFactory } from "./presentation/handlers/destinationHandler"; // Destination用GETハンドラ

import { ListDestinationsUseCase } from "./application/usecases/listDestinationsUseCase"; // Destination用Listユースケース
import { listDestinationsHandlerFactory } from "./presentation/handlers/destinationHandler"; // Destination用Listハンドラ
import { UpdateDestinationUseCase } from "./application/usecases/updateDestinationUseCase";
import { DeleteDestinationUseCase } from "./application/usecases/deleteDestinationUseCase";

const app = new Hono();

// --- DIのセットアップ ---
const USE_FIRESTORE_DB = true; // このフラグで実際に使うリポジトリを切り替える
// (将来的には環境変数とかで制御するのがええで)

let templateRepository: TemplateRepository;
let repositoryTypeMessage: string; // ログ用のメッセージを保持する変数

if (USE_FIRESTORE_DB) {
	templateRepository = new FirestoreTemplateRepository();
	repositoryTypeMessage = "Using FirestoreTemplateRepository (for development)";
} else {
	templateRepository = new InMemoryTemplateRepository();
	repositoryTypeMessage = "Using InMemoryTemplateRepository (for development)";
}

let destinationRepository: DestinationRepository;

if (USE_FIRESTORE_DB) {
	// templateRepository = new FirestoreTemplateRepository(); // (これは設定済み)
	destinationRepository = new FirestoreDestinationRepository();
	// repositoryTypeMessage = "Using FirestoreTemplateRepository (for development)"; // メッセージは工夫が必要になるな
	// 例えば、どのリポジトリが何を使ってるか、もっと詳しく出すとか
} else {
	// templateRepository = new InMemoryTemplateRepository(); // (これは設定済み)
	// destinationRepository = new InMemoryDestinationRepository(); // インメモリも用意するなら
	// repositoryTypeMessage = "Using InMemoryTemplateRepository (for development)";
	throw new Error(
		"InMemoryDestinationRepository not implemented for this example yet if needed",
	);
}

const createTemplateUseCase = new CreateTemplateUseCase(templateRepository);
const getTemplateUseCase = new GetTemplateUseCase(templateRepository);
const listTemplatesUseCase = new ListTemplatesUseCase(templateRepository);
const updateTemplateUseCase = new UpdateTemplateUseCase(templateRepository);
const deleteTemplateUseCase = new DeleteTemplateUseCase(templateRepository);
const createDestinationUseCase = new CreateDestinationUseCase(
	destinationRepository,
); // Destination用ユースケースもインスタンス化
const getDestinationUseCase = new GetDestinationUseCase(destinationRepository); // Destination用GETユースケースもインスタンス化
const listDestinationsUseCase = new ListDestinationsUseCase(
	destinationRepository,
);
const updateDestinationUseCase = new UpdateDestinationUseCase(
	destinationRepository,
);
const deleteDestinationUseCase = new DeleteDestinationUseCase(
	destinationRepository,
);

// --- ルーティング定義 ---
const apiRoutes = new Hono();
app.post(
	"/api/v1/templates",
	createTemplateHandlerFactory(createTemplateUseCase),
);
app.get(
	"/api/v1/templates/:id",
	getTemplateByIdHandlerFactory(getTemplateUseCase),
);
app.get("/api/v1/templates", listTemplatesHandlerFactory(listTemplatesUseCase));

app.put(
	"/api/v1/templates/:id",
	updateTemplateHandlerFactory(updateTemplateUseCase),
);
app.delete(
	"/api/v1/templates/:id",
	deleteTemplateHandlerFactory(deleteTemplateUseCase),
);
app.post(
	"/api/v1/destinations",
	createDestinationHandlerFactory(createDestinationUseCase),
);
app.get(
	"/api/v1/destinations/:id",
	getDestinationByIdHandlerFactory(getDestinationUseCase),
);
app.get(
	"/api/v1/destinations",
	listDestinationsHandlerFactory(listDestinationsUseCase),
);
app.put(
	"/api/v1/destinations/:id",
	updateDestinationHandlerFactory(updateDestinationUseCase),
);
app.delete(
	"/api/v1/destinations/:id",
	deleteDestinationHandlerFactory(deleteDestinationUseCase),
);

app.route("/api/v1", apiRoutes);
app.get("/", (c) => {
	return c.text("Notifier App is running!");
});

export default {
	port: 3000,
	fetch: app.fetch,
};

console.log("Notifier app is running on port 3000");
if (process.env.NODE_ENV !== "production") {
	console.log(repositoryTypeMessage); // ← ここで保存しておいたメッセージを表示
}
