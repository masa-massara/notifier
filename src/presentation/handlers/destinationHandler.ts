// src/presentation/handlers/destinationHandler.ts
import type { Context } from "hono";
import type {
	CreateDestinationUseCase,
	CreateDestinationInput,
	CreateDestinationOutput,
} from "../../application/usecases/createDestinationUseCase";

import type {
	GetDestinationUseCase,
	GetDestinationInput,
	GetDestinationOutput,
} from "../../application/usecases/getDestinationUseCase";

import type {
	ListDestinationsUseCase,
	ListDestinationsOutput,
} from "../../application/usecases/listDestinationsUseCase";

import type {
	UpdateDestinationUseCase,
	UpdateDestinationInput,
	UpdateDestinationOutput,
} from "../../application/usecases/updateDestinationUseCase";

import type {
	DeleteDestinationUseCase,
	DeleteDestinationInput,
} from "../../application/usecases/deleteDestinationUseCase";

export const createDestinationHandlerFactory = (
	createDestinationUseCase: CreateDestinationUseCase,
) => {
	console.log("--- createDestinationHandlerFactory called ---"); // 起動時に呼ばれるログ
	return async (c: Context): Promise<Response> => {
		console.log("--- createDestinationHandler (actual handler) called ---"); // リクエスト時に呼ばれるログ
		try {
			const body = await c.req.json<CreateDestinationInput>();

			if (!body.webhookUrl) {
				// Webhook URLは必須
				return c.json({ error: "webhookUrl is required" }, 400);
			}

			const result: CreateDestinationOutput =
				await createDestinationUseCase.execute(body);

			return c.json(result, 201); // 201 Created
			// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		} catch (error: any) {
			console.error("Error in createDestinationHandler:", error);
			if (error.message.includes("Invalid Webhook URL format")) {
				return c.json(
					{ error: "Validation failed", details: error.message },
					400,
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
	console.log("--- getDestinationByIdHandlerFactory called ---"); // 起動時に呼ばれるログ
	return async (c: Context): Promise<Response> => {
		console.log("--- getDestinationByIdHandler (actual handler) called ---"); // リクエスト時に呼ばれるログ
		try {
			const id = c.req.param("id");
			if (!id) {
				return c.json({ error: "Destination ID is required" }, 400);
			}

			const input: GetDestinationInput = { id };
			const result: GetDestinationOutput =
				await getDestinationUseCase.execute(input);

			if (!result) {
				return c.json({ error: "Destination not found" }, 404);
			}

			return c.json(result, 200);
			// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		} catch (error: any) {
			console.error("Error in getDestinationByIdHandler:", error);
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
	console.log("--- listDestinationsHandlerFactory called ---"); // 起動時に呼ばれるログ
	return async (c: Context): Promise<Response> => {
		console.log("--- listDestinationsHandler (actual handler) called ---"); // リクエスト時に呼ばれるログ
		try {
			console.log("Handler: Calling ListDestinationsUseCase...");
			const result: ListDestinationsOutput =
				await listDestinationsUseCase.execute();
			console.log(
				`Handler: ListDestinationsUseCase returned ${result.length} destinations.`,
			);
			return c.json(result, 200); // 200 OK
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
	console.log("--- updateDestinationHandlerFactory called ---");
	return async (c: Context): Promise<Response> => {
		console.log("--- updateDestinationHandler (actual handler) called ---");
		try {
			const id = c.req.param("id");
			if (!id) {
				return c.json({ error: "Destination ID is required in path" }, 400);
			}

			const body = await c.req.json<Omit<UpdateDestinationInput, "id">>();

			if (Object.keys(body).length === 0) {
				return c.json(
					{ error: "Request body cannot be empty for update" },
					400,
				);
			}

			const input: UpdateDestinationInput = { id, ...body };
			console.log(
				"Handler: Calling UpdateDestinationUseCase with input:",
				input,
			);
			const result: UpdateDestinationOutput =
				await updateDestinationUseCase.execute(input);
			console.log("Handler: UpdateDestinationUseCase returned:", result);

			return c.json(result, 200); // 200 OK
			// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		} catch (error: any) {
			console.error("Error in updateDestinationHandler:", error);
			if (error.message.includes("not found")) {
				return c.json({ error: "Destination not found" }, 404);
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
	console.log("--- deleteDestinationHandlerFactory called ---");
	return async (c: Context): Promise<Response> => {
		console.log("--- deleteDestinationHandler (actual handler) called ---");
		try {
			const id = c.req.param("id");
			if (!id) {
				return c.json({ error: "Destination ID is required in path" }, 400);
			}

			const input: DeleteDestinationInput = { id };
			console.log(
				"Handler: Calling DeleteDestinationUseCase with input:",
				input,
			);
			await deleteDestinationUseCase.execute(input);
			console.log("Handler: DeleteDestinationUseCase processed.");

			return c.body(null, 204); // 204 No Content
			// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		} catch (error: any) {
			console.error("Error in deleteDestinationHandler:", error);
			return c.json(
				{ error: "Failed to delete destination", details: error.message },
				500,
			);
		}
	};
};
