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

const createTemplateUseCase = new CreateTemplateUseCase(templateRepository);
const getTemplateUseCase = new GetTemplateUseCase(templateRepository);
const listTemplatesUseCase = new ListTemplatesUseCase(templateRepository);
const updateTemplateUseCase = new UpdateTemplateUseCase(templateRepository);
const deleteTemplateUseCase = new DeleteTemplateUseCase(templateRepository);

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
