// src/presentation/handlers/userNotionIntegrationHandler.ts (修正版)

import type { Context } from "hono"; // Hono標準のContextを使う
import type { CreateUserNotionIntegrationUseCase } from "../../application/usecases/createUserNotionIntegrationUseCase";
import type { ListUserNotionIntegrationsUseCase } from "../../application/usecases/listUserNotionIntegrationsUseCase";
import type { DeleteUserNotionIntegrationUseCase } from "../../application/usecases/deleteUserNotionIntegrationUseCase";
import type {
	CreateUserNotionIntegrationInput,
	DeleteUserNotionIntegrationInput,
	// Assuming CreateUserNotionIntegrationOutput is also in this DTO file or imported
	CreateUserNotionIntegrationOutput,
} from "../../application/dtos/userNotionIntegrationDTOs";
import { HTTPException } from "hono/http-exception";

// AuthenticatedContext インターフェースの定義は削除する！

export function createUserNotionIntegrationHandlers(
	createUseCase: CreateUserNotionIntegrationUseCase,
	listUseCase: ListUserNotionIntegrationsUseCase,
	deleteUseCase: DeleteUserNotionIntegrationUseCase,
) {
	const createIntegrationHandler = async (c: Context) => {
		try {
			const { integrationName, notionIntegrationToken } = await c.req.json<{
				integrationName: string;
				notionIntegrationToken: string;
			}>();

			// authMiddlewareを通過していれば、userId は string 型として取得できるはず
			// Honoの型拡張により、c.var.userId も string としてアクセス可能
			// c.get() の方がより明示的かもしれない
			const userId = c.var.userId; // または c.get("userId")

			// 型ガード (より安全にするなら)
			if (typeof userId !== "string") {
				console.error(
					"CRITICAL: userId not found in context or is not a string after authMiddleware.",
				);
				throw new HTTPException(401, {
					message: "Unauthorized: User ID not found or invalid.",
				});
			}

			if (!integrationName || !notionIntegrationToken) {
				throw new HTTPException(400, {
					message: "integrationName and notionIntegrationToken are required",
				});
			}

			const input: CreateUserNotionIntegrationInput = {
				userId, // ここでは userId は string と確定
				integrationName,
				notionIntegrationToken,
			};

			const output = await createUseCase.execute(input);
			return c.json(output, 201);
			// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		} catch (error: any) {
			console.error("Error in createIntegrationHandler:", error);
			if (error instanceof HTTPException) throw error;
			throw new HTTPException(500, {
				message: "Failed to create Notion integration",
				cause: error,
			});
		}
	};

	const listIntegrationsHandler = async (c: Context) => {
		// c の型を Context に変更
		try {
			const userId = c.var.userId; // または c.get("userId")
			if (typeof userId !== "string") {
				console.error(
					"CRITICAL: userId not found in context or is not a string after authMiddleware.",
				);
				throw new HTTPException(401, {
					message: "Unauthorized: User ID not found or invalid.",
				});
			}
			const output = await listUseCase.execute({ userId });
			return c.json(output, 200);
			// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		} catch (error: any) {
			console.error("Error in listIntegrationsHandler:", error);
			throw new HTTPException(500, {
				message: "Failed to list Notion integrations",
				cause: error,
			});
		}
	};

	const deleteIntegrationHandler = async (c: Context) => {
		// c の型を Context に変更
		try {
			const integrationId = c.req.param("integrationId");
			const userId = c.var.userId; // または c.get("userId")

			if (typeof userId !== "string") {
				console.error(
					"CRITICAL: userId not found in context or is not a string after authMiddleware.",
				);
				throw new HTTPException(401, {
					message: "Unauthorized: User ID not found or invalid.",
				});
			}

			if (!integrationId) {
				throw new HTTPException(400, {
					message: "integrationId path parameter is required",
				});
			}

			const input: DeleteUserNotionIntegrationInput = {
				integrationId,
				userId,
			};

			const result = await deleteUseCase.execute(input);

			if (!result.success) {
				throw new HTTPException(404, {
					message:
						result.message ||
						`Notion integration with ID ${integrationId} not found.`,
				});
			}
			return c.json({ message: result.message }, 200); // 成功時は200 OKとメッセージを返す例
			// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		} catch (error: any) {
			console.error("Error in deleteIntegrationHandler:", error);
			if (error instanceof HTTPException) throw error;
			throw new HTTPException(500, {
				message: "Failed to delete Notion integration",
				cause: error,
			});
		}
	};

	return {
		createIntegrationHandler,
		listIntegrationsHandler,
		deleteIntegrationHandler,
	};
}
