// src/presentation/handlers/templateHandler.ts
import type { Context } from "hono";
import type {
	CreateTemplateUseCase,
	CreateTemplateInput,
	CreateTemplateOutput, // Outputもインポートしとくと型安全でええな
} from "../../application/usecases/createTemplateUseCase";

import type {
	GetTemplateUseCase,
	GetTemplateInput,
	GetTemplateOutput,
} from "../../application/usecases/getTemplateUseCase";

import type {
	ListTemplatesUseCase,
	ListTemplatesOutput,
} from "../../application/usecases/listTemplatesUseCase";

import type {
	UpdateTemplateUseCase,
	UpdateTemplateInput, // Inputも型としてインポート
	UpdateTemplateOutput,
} from "../../application/usecases/updateTemplateUseCase";

import type {
	DeleteTemplateUseCase,
	DeleteTemplateInput, // Inputも型としてインポート
} from "../../application/usecases/deleteTemplateUseCase";
// TemplateRepository は直接は使わんけど、ユースケースが依存してるっていう文脈で置いといてもええかも
// import { TemplateRepository } from '../../domain/repositories/templateRepository';

export const createTemplateHandlerFactory = (
	// ファクトリ関数であることが分かりやすいように名前変更
	createTemplateUseCase: CreateTemplateUseCase,
) => {
	console.log("--- createTemplateHandlerFactory called ---"); // ← これを追加！
	return async (c: Context): Promise<Response> => {
		// Honoのハンドラの戻り値は Response | Promise<Response> やけど、通常はResponseを返す
		try {
			const body = await c.req.json<CreateTemplateInput>();

			// 簡単なバリデーション (本来はhono/validatorとか使うのがええで)
			if (
				!body.name ||
				!body.notionDatabaseId ||
				!body.body ||
				!body.conditions || // conditions も必須にしとこか
				!body.destinationId
			) {
				return c.json({ error: "Missing required fields" }, 400);
			}

			const result: CreateTemplateOutput =
				await createTemplateUseCase.execute(body);

			return c.json(result, 201); // 201 Created
			// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		} catch (error: any) {
			console.error("Error in createTemplateHandler:", error);
			// エラーの種類に応じてステータスコードを分けるのが理想
			// 例えば、もしユースケース側で特定のビジネスエラーを投げるなら、それを判定して4xx系を返すとか
			if (error.message.includes("cannot be empty")) {
				// これはTemplateエンティティのバリデーションエラーの例
				return c.json(
					{ error: "Validation failed", details: error.message },
					400,
				);
			}
			return c.json(
				{ error: "Failed to create template", details: error.message },
				500,
			);
		}
	};
};
export const getTemplateByIdHandlerFactory = (
	getTemplateUseCase: GetTemplateUseCase,
) => {
	console.log("~~~ getTemplateHandlerFactory called ~~~");

	return async (c: Context): Promise<Response> => {
		console.log("~~~ getTemplateHandler called ~~~");

		try {
			const id = c.req.param("id"); // URLのパスパラメータからIDを取得
			if (!id) {
				return c.json({ error: "Template ID is required" }, 400);
			}

			const input: GetTemplateInput = { id };
			const result: GetTemplateOutput = await getTemplateUseCase.execute(input);

			if (!result) {
				return c.json({ error: "Template not found" }, 404); // 404 Not Found
			}

			return c.json(result, 200); // 200 OK
			// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		} catch (error: any) {
			console.error("Error in getTemplateByIdHandler:", error);
			return c.json(
				{ error: "Failed to get template", details: error.message },
				500,
			);
		}
	};
};

export const listTemplatesHandlerFactory = (
	listTemplatesUseCase: ListTemplatesUseCase,
) => {
	return async (c: Context): Promise<Response> => {
		// このファクトリ関数が呼ばれた時のログはアプリ起動時に出るやつやったな
		// console.log('--- listTemplatesHandlerFactory called ---');
		console.log("--- listTemplatesHandler (actual handler) called ---"); // ★リクエスト時に呼ばれるハンドラ関数のログ
		try {
			console.log("Handler: Calling ListTemplatesUseCase..."); // ★ログ追加
			const result: ListTemplatesOutput = await listTemplatesUseCase.execute();
			console.log(
				`Handler: ListTemplatesUseCase returned ${result.length} templates.`,
			); // ★ログ追加
			return c.json(result, 200);
			// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		} catch (error: any) {
			console.error("Error in listTemplatesHandler:", error);
			return c.json(
				{ error: "Failed to list templates", details: error.message },
				500,
			);
		}
	};
};

export const updateTemplateHandlerFactory = (
	updateTemplateUseCase: UpdateTemplateUseCase,
) => {
	return async (c: Context): Promise<Response> => {
		console.log("--- updateTemplateHandlerFactory called ---");
		try {
			const id = c.req.param("id");
			if (!id) {
				return c.json({ error: "Template ID is required in path" }, 400);
			}

			const body = await c.req.json<Omit<UpdateTemplateInput, "id">>(); // ボディからはIDを除いた型で受け取る

			// 簡単なバリデーション (更新内容が空っぽじゃないかとか)
			if (Object.keys(body).length === 0) {
				return c.json(
					{ error: "Request body cannot be empty for update" },
					400,
				);
			}

			const input: UpdateTemplateInput = { id, ...body }; // IDとボディを結合
			const result: UpdateTemplateOutput =
				await updateTemplateUseCase.execute(input);

			return c.json(result, 200); // 200 OK
			// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		} catch (error: any) {
			console.error("Error in updateTemplateHandler:", error);
			if (error.message.includes("not found")) {
				return c.json({ error: "Template not found" }, 404);
			}
			if (error.message.includes("cannot be empty")) {
				// Templateエンティティのバリデーションエラーの例
				return c.json(
					{ error: "Validation failed", details: error.message },
					400,
				);
			}
			return c.json(
				{ error: "Failed to update template", details: error.message },
				500,
			);
		}
	};
};

export const deleteTemplateHandlerFactory = (
	deleteTemplateUseCase: DeleteTemplateUseCase,
) => {
	return async (c: Context): Promise<Response> => {
		console.log("--- deleteTemplateHandlerFactory called ---");
		try {
			const id = c.req.param("id");
			if (!id) {
				return c.json({ error: "Template ID is required in path" }, 400);
			}

			const input: DeleteTemplateInput = { id };
			await deleteTemplateUseCase.execute(input);

			// 削除成功時は、204 No Content (レスポンスボディなし) か
			// 200 OK で成功メッセージを返すのが一般的
			return c.body(null, 204); // 204 No Content
			// または return c.json({ message: 'Template deleted successfully' }, 200);
			// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		} catch (error: any) {
			console.error("Error in deleteTemplateHandler:", error);
			// ここでも、もしユースケース側で「見つからなかった」場合に特定のカスタムエラーを投げるなら、
			// それをキャッチして404を返すようにできる。
			// 今回はdeleteByIdが冪等であると仮定してるので、基本的には500系エラーを想定。
			return c.json(
				{ error: "Failed to delete template", details: error.message },
				500,
			);
		}
	};
};
