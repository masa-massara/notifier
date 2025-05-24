// src/presentation/handlers/notionDatabaseHandler.ts
import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import type { GetNotionDatabasePropertiesUseCase } from "../../application/usecases/getNotionDatabasePropertiesUseCase";
import type { 
    GetNotionDatabasePropertiesInput, 
    GetNotionDatabasePropertiesOutput 
} from "../../application/dtos/notionDatabaseDTOs";

export function getNotionDatabasePropertiesHandlerFactory(
    useCase: GetNotionDatabasePropertiesUseCase
) {
    return async (c: Context) => {
        try {
            const databaseId = c.req.param("databaseId");
            const integrationId = c.req.query("integrationId"); // As per spec, it's a query param
            const userId = c.var.userId; // Or c.get("userId")

            if (typeof userId !== "string") {
                console.error("CRITICAL: userId not found in context or is not a string after authMiddleware.");
                throw new HTTPException(401, { message: "Unauthorized: User ID not found or invalid." });
            }

            if (!databaseId) {
                throw new HTTPException(400, { message: "databaseId path parameter is required" });
            }

            if (!integrationId) {
                // The use case treats this as mandatory.
                throw new HTTPException(400, { message: "integrationId query parameter is required" });
            }

            const input: GetNotionDatabasePropertiesInput = {
                databaseId,
                userId,
                integrationId,
            };

            const output: GetNotionDatabasePropertiesOutput = await useCase.execute(input);
            return c.json(output, 200);

        } catch (error: any) {
            console.error(`Error in getNotionDatabasePropertiesHandler for DB ${c.req.param("databaseId")}:`, error);
            if (error instanceof HTTPException) {
                // Re-throw HTTPException directly if it's already one
                throw error;
            }
            // For other types of errors, wrap them in a generic 500 error
            throw new HTTPException(500, {
                message: "Failed to get Notion database properties",
                cause: error.message || error,
            });
        }
    };
}
