// src/presentation/handlers/templateHandler.ts
import type { Context } from "hono";
import type {
	CreateTemplateUseCase,
	CreateTemplateInput,
	CreateTemplateOutput,
} from "../../application/usecases/createTemplateUseCase";

import type {
	GetTemplateUseCase,
	GetTemplateInput,
	GetTemplateOutput,
} from "../../application/usecases/getTemplateUseCase";

import type {
	ListTemplatesUseCase,
	ListTemplatesInput, // ★ ListTemplatesInput をインポート
	ListTemplatesOutput,
} from "../../application/usecases/listTemplatesUseCase";

import type {
	UpdateTemplateUseCase,
	UpdateTemplateInput,
	UpdateTemplateOutput,
} from "../../application/usecases/updateTemplateUseCase";

import type {
	DeleteTemplateUseCase,
	DeleteTemplateInput,
} from "../../application/usecases/deleteTemplateUseCase";

export const createTemplateHandlerFactory = (
	createTemplateUseCase: CreateTemplateUseCase,
) => {
	return async (c: Context): Promise<Response> => {
		try {
			const userId = c.get("userId") as string | undefined;
			if (!userId) {
				console.error(
					"Error in createTemplateHandler: userId not found in context.",
				);
				return c.json(
					{ error: "Unauthorized", message: "User ID not found." },
					401,
				);
			}

			// Explicitly define the expected request body structure
			const requestBody = await c.req.json<{
				name: string;
				notionDatabaseId: string;
				body: string;
				conditions: CreateTemplateInput['conditions']; // Use from imported CreateTemplateInput
				destinationId: string;
				userNotionIntegrationId: string;
			}>();

			if (
				!requestBody.name ||
				!requestBody.notionDatabaseId ||
				!requestBody.body ||
				!requestBody.conditions || // consider Array.isArray(requestBody.conditions)
				!requestBody.destinationId ||
				!requestBody.userNotionIntegrationId // Added check
			) {
				return c.json({ error: "Missing required fields" }, 400);
			}

			const input: CreateTemplateInput = {
				name: requestBody.name,
				notionDatabaseId: requestBody.notionDatabaseId,
				body: requestBody.body,
				conditions: requestBody.conditions,
				destinationId: requestBody.destinationId,
				userNotionIntegrationId: requestBody.userNotionIntegrationId, // Pass it here
				userId: userId, // userId from context
			};

			const result: CreateTemplateOutput =
				await createTemplateUseCase.execute(input);

			return c.json(result, 201);
			// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		} catch (error: any) {
			console.error("Error in createTemplateHandler:", error);
			if (error.message.includes("cannot be empty")) {
				return c.json(
					{ error: "Validation failed", details: error.message },
					400,
				);
			}
			if (error.message.includes("not found or not accessible")) {
				return c.json(
					{ error: "Forbidden or Not Found", details: error.message },
					403,
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
	return async (c: Context): Promise<Response> => {
		try {
			const userId = c.get("userId") as string | undefined;
			if (!userId) {
				console.error(
					"Error in getTemplateByIdHandler: userId not found in context.",
				);
				return c.json(
					{ error: "Unauthorized", message: "User ID not found." },
					401,
				);
			}

			const id = c.req.param("id");
			if (!id) {
				return c.json({ error: "Template ID is required" }, 400);
			}

			const input: GetTemplateInput = { id, userId: userId };
			const result: GetTemplateOutput = await getTemplateUseCase.execute(input);

			if (!result) {
				return c.json({ error: "Template not found" }, 404);
			}

			return c.json(result, 200);
			// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		} catch (error: any) {
			console.error("Error in getTemplateByIdHandler:", error);
			if (error.message.includes("not found or not accessible")) {
				return c.json(
					{ error: "Forbidden or Not Found", details: error.message },
					403,
				);
			}
			return c.json(
				{ error: "Failed to get template", details: error.message },
				500,
			);
		}
	};
};

// ★★★ listTemplatesHandlerFactory の実装 ★★★
export const listTemplatesHandlerFactory = (
	listTemplatesUseCase: ListTemplatesUseCase,
) => {
	return async (c: Context): Promise<Response> => {
		try {
			const userId = c.get("userId") as string | undefined;
			if (!userId) {
				console.error(
					"Error in listTemplatesHandler: userId not found in context.",
				);
				return c.json(
					{ error: "Unauthorized", message: "User ID not found." },
					401,
				);
			}

			const input: ListTemplatesInput = { userId: userId };
			console.log(
				`Handler: Calling ListTemplatesUseCase for user ${userId}...`,
			);
			const result: ListTemplatesOutput =
				await listTemplatesUseCase.execute(input);
			console.log(
				`Handler: ListTemplatesUseCase returned ${result.length} templates for user ${userId}.`,
			);
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

// ★★★ updateTemplateHandlerFactory の実装 ★★★
export const updateTemplateHandlerFactory = (
	updateTemplateUseCase: UpdateTemplateUseCase,
) => {
	return async (c: Context): Promise<Response> => {
		try {
			const userId = c.get("userId") as string | undefined;
			if (!userId) {
				console.error(
					"Error in updateTemplateHandler: userId not found in context.",
				);
				return c.json(
					{ error: "Unauthorized", message: "User ID not found." },
					401,
				);
			}

			const id = c.req.param("id");
			if (!id) {
				return c.json({ error: "Template ID is required in path" }, 400);
			}

			const bodyWithoutUserId =
				await c.req.json<Omit<UpdateTemplateInput, "id" | "userId">>();

			if (Object.keys(bodyWithoutUserId).length === 0) {
				return c.json(
					{ error: "Request body cannot be empty for update" },
					400,
				);
			}

			const input: UpdateTemplateInput = {
				id,
				...bodyWithoutUserId,
				userId: userId,
			};
			const result: UpdateTemplateOutput =
				await updateTemplateUseCase.execute(input);

			return c.json(result, 200);
			// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		} catch (error: any) {
			console.error("Error in updateTemplateHandler:", error);
			if (error.message.includes("not found or not accessible")) {
				return c.json({ error: "Template not found or not accessible" }, 404); // 403 or 404
			}
			if (error.message.includes("cannot be empty")) {
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

// ★★★ deleteTemplateHandlerFactory の実装 ★★★
export const deleteTemplateHandlerFactory = (
	deleteTemplateUseCase: DeleteTemplateUseCase,
) => {
	return async (c: Context): Promise<Response> => {
		try {
			const userId = c.get("userId") as string | undefined;
			if (!userId) {
				console.error(
					"Error in deleteTemplateHandler: userId not found in context.",
				);
				return c.json(
					{ error: "Unauthorized", message: "User ID not found." },
					401,
				);
			}

			const id = c.req.param("id");
			if (!id) {
				return c.json({ error: "Template ID is required in path" }, 400);
			}

			const input: DeleteTemplateInput = { id, userId: userId };
			await deleteTemplateUseCase.execute(input);

			return c.body(null, 204); // 204 No Content
			// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		} catch (error: any) {
			console.error("Error in deleteTemplateHandler:", error);
			if (error.message.includes("not found or not accessible")) {
				return c.json({ error: "Template not found or not accessible" }, 404); // 403 or 404
			}
			return c.json(
				{ error: "Failed to delete template", details: error.message },
				500,
			);
		}
	};
};
