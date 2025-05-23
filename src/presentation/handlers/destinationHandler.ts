// src/presentation/handlers/destinationHandler.ts
import type { Context } from "hono";
// ユースケースのInput/Output型は、userIdを含むように修正されたものをインポートする
import type {
	CreateDestinationUseCase,
	CreateDestinationInput, // userId を含む
	CreateDestinationOutput, // userId を含む
} from "../../application/usecases/createDestinationUseCase";

import type {
	GetDestinationUseCase,
	GetDestinationInput, // userId を含む
	GetDestinationOutput, // userId を含む Destination | null
} from "../../application/usecases/getDestinationUseCase";

import type {
	ListDestinationsUseCase,
	ListDestinationsInput, // userId を含む
	ListDestinationsOutput, // userId を含む Destination[]
} from "../../application/usecases/listDestinationsUseCase";

import type {
	UpdateDestinationUseCase,
	UpdateDestinationInput, // userId を含む
	UpdateDestinationOutput, // userId を含む Destination
} from "../../application/usecases/updateDestinationUseCase";

import type {
	DeleteDestinationUseCase,
	DeleteDestinationInput, // userId を含む
} from "../../application/usecases/deleteDestinationUseCase";

export const createDestinationHandlerFactory = (
	createDestinationUseCase: CreateDestinationUseCase,
) => {
	return async (c: Context): Promise<Response> => {
		try {
			const userId = c.get("userId") as string | undefined; // ★ userIdを取得
			if (!userId) {
				console.error(
					"Error in createDestinationHandler: userId not found in context.",
				);
				return c.json(
					{ error: "Unauthorized", message: "User ID not found." },
					401,
				);
			}

			const bodyWithoutUserId =
				await c.req.json<Omit<CreateDestinationInput, "userId">>();

			if (!bodyWithoutUserId.webhookUrl) {
				return c.json({ error: "webhookUrl is required" }, 400);
			}

			const input: CreateDestinationInput = {
				// ★ InputにuserIdをセット
				...bodyWithoutUserId,
				userId: userId,
			};

			const result: CreateDestinationOutput =
				await createDestinationUseCase.execute(input);

			return c.json(result, 201);
			// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		} catch (error: any) {
			console.error("Error in createDestinationHandler:", error);
			if (error.message.includes("Invalid Webhook URL format")) {
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
				{ error: "Failed to create destination", details: error.message },
				500,
			);
		}
	};
};

export const getDestinationByIdHandlerFactory = (
	getDestinationUseCase: GetDestinationUseCase,
) => {
	return async (c: Context): Promise<Response> => {
		try {
			const userId = c.get("userId") as string | undefined; // ★ userIdを取得
			if (!userId) {
				console.error(
					"Error in getDestinationByIdHandler: userId not found in context.",
				);
				return c.json(
					{ error: "Unauthorized", message: "User ID not found." },
					401,
				);
			}

			const id = c.req.param("id");
			if (!id) {
				return c.json({ error: "Destination ID is required" }, 400);
			}

			const input: GetDestinationInput = { id, userId: userId }; // ★ InputにuserIdをセット
			const result: GetDestinationOutput =
				await getDestinationUseCase.execute(input);

			if (!result) {
				return c.json({ error: "Destination not found" }, 404);
			}

			return c.json(result, 200);
			// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		} catch (error: any) {
			console.error("Error in getDestinationByIdHandler:", error);
			if (error.message.includes("not found or not accessible")) {
				return c.json(
					{ error: "Forbidden or Not Found", details: error.message },
					403,
				);
			}
			return c.json(
				{ error: "Failed to get destination", details: error.message },
				500,
			);
		}
	};
};

export const listDestinationsHandlerFactory = (
	listDestinationsUseCase: ListDestinationsUseCase,
) => {
	return async (c: Context): Promise<Response> => {
		try {
			const userId = c.get("userId") as string | undefined; // ★ userIdを取得
			if (!userId) {
				console.error(
					"Error in listDestinationsHandler: userId not found in context.",
				);
				return c.json(
					{ error: "Unauthorized", message: "User ID not found." },
					401,
				);
			}

			const input: ListDestinationsInput = { userId: userId }; // ★ InputにuserIdをセット
			console.log(
				`Handler: Calling ListDestinationsUseCase for user ${userId}...`,
			);
			const result: ListDestinationsOutput =
				await listDestinationsUseCase.execute(input);
			console.log(
				`Handler: ListDestinationsUseCase returned ${result.length} destinations for user ${userId}.`,
			);
			return c.json(result, 200);
			// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		} catch (error: any) {
			console.error("Error in listDestinationsHandler:", error);
			return c.json(
				{ error: "Failed to list destinations", details: error.message },
				500,
			);
		}
	};
};

export const updateDestinationHandlerFactory = (
	updateDestinationUseCase: UpdateDestinationUseCase,
) => {
	return async (c: Context): Promise<Response> => {
		try {
			const userId = c.get("userId") as string | undefined; // ★ userIdを取得
			if (!userId) {
				console.error(
					"Error in updateDestinationHandler: userId not found in context.",
				);
				return c.json(
					{ error: "Unauthorized", message: "User ID not found." },
					401,
				);
			}

			const id = c.req.param("id");
			if (!id) {
				return c.json({ error: "Destination ID is required in path" }, 400);
			}

			const bodyWithoutUserId =
				await c.req.json<Omit<UpdateDestinationInput, "id" | "userId">>();

			if (Object.keys(bodyWithoutUserId).length === 0) {
				return c.json(
					{ error: "Request body cannot be empty for update" },
					400,
				);
			}

			const input: UpdateDestinationInput = {
				// ★ InputにuserIdをセット
				id,
				...bodyWithoutUserId,
				userId: userId,
			};
			console.log(
				"Handler: Calling UpdateDestinationUseCase with input:",
				input,
			);
			const result: UpdateDestinationOutput =
				await updateDestinationUseCase.execute(input);
			console.log("Handler: UpdateDestinationUseCase returned:", result);

			return c.json(result, 200);
			// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		} catch (error: any) {
			console.error("Error in updateDestinationHandler:", error);
			if (error.message.includes("not found or not accessible")) {
				// "not found" だけだと曖昧なので、より具体的に
				return c.json(
					{ error: "Destination not found or not accessible" },
					404,
				); // 403 or 404
			}
			if (
				error.message.includes("Invalid Webhook URL format") ||
				error.message.includes("cannot be empty")
			) {
				return c.json(
					{ error: "Validation failed", details: error.message },
					400,
				);
			}
			return c.json(
				{ error: "Failed to update destination", details: error.message },
				500,
			);
		}
	};
};

export const deleteDestinationHandlerFactory = (
	deleteDestinationUseCase: DeleteDestinationUseCase,
) => {
	return async (c: Context): Promise<Response> => {
		try {
			const userId = c.get("userId") as string | undefined; // ★ userIdを取得
			if (!userId) {
				console.error(
					"Error in deleteDestinationHandler: userId not found in context.",
				);
				return c.json(
					{ error: "Unauthorized", message: "User ID not found." },
					401,
				);
			}

			const id = c.req.param("id");
			if (!id) {
				return c.json({ error: "Destination ID is required in path" }, 400);
			}

			const input: DeleteDestinationInput = { id, userId: userId }; // ★ InputにuserIdをセット
			console.log(
				"Handler: Calling DeleteDestinationUseCase with input:",
				input,
			);
			await deleteDestinationUseCase.execute(input);
			console.log("Handler: DeleteDestinationUseCase processed.");

			return c.body(null, 204);
			// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		} catch (error: any) {
			console.error("Error in deleteDestinationHandler:", error);
			if (error.message.includes("not found or not accessible")) {
				return c.json(
					{ error: "Destination not found or not accessible" },
					404,
				); // 403 or 404
			}
			return c.json(
				{ error: "Failed to delete destination", details: error.message },
				500,
			);
		}
	};
};
