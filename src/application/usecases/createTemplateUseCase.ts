// src/application/usecases/createTemplateUseCase.ts
import {
	Template,
	type TemplateCondition,
} from "../../domain/entities/template";
import type { TemplateRepository } from "../../domain/repositories/templateRepository";
import type { UserNotionIntegrationRepository } from "../../domain/repositories/userNotionIntegrationRepository";
import type { EncryptionService } from "../../domain/services/encryptionService";
import type { NotionApiService } from "../../domain/services/notionApiService";
import { v4 as uuidv4 } from "uuid"; // ID生成用

// ユースケースに入力されるデータのための型 (DTO: Data Transfer Object)
export interface CreateTemplateInput {
	name: string;
	notionDatabaseId: string;
	body: string;
	conditions: TemplateCondition[]; // Templateエンティティで定義した型を使う
	destinationId: string;
	userId: string;
	userNotionIntegrationId: string; // Added
}

// ユースケースが出力するデータのための型 (DTO) - 作成されたテンプレートを返す場合
export interface CreateTemplateOutput {
	id: string;
	name: string;
	notionDatabaseId: string;
	body: string;
	conditions: TemplateCondition[];
	destinationId: string;
	userId: string;
	userNotionIntegrationId: string | null; // Added
	createdAt: Date;
	updatedAt: Date;
}

export class CreateTemplateUseCase {
	constructor(
		private readonly templateRepository: TemplateRepository,
		private readonly userNotionIntegrationRepository: UserNotionIntegrationRepository,
		private readonly encryptionService: EncryptionService,
		private readonly notionApiService: NotionApiService,
	) {}

	async execute(input: CreateTemplateInput): Promise<CreateTemplateOutput> {
		// 1. Fetch and validate UserNotionIntegration
		const integration = await this.userNotionIntegrationRepository.findById(
			input.userNotionIntegrationId,
			input.userId,
		);

		if (!integration) {
			throw new Error("UserNotionIntegration not found or access denied.");
		}
		// Note: findById should ideally prevent integration.userId !== input.userId
		// but a double check or reliance on repository's strictness is fine.

		// 2. Decrypt Notion token
		let decryptedToken: string;
		try {
			decryptedToken = await this.encryptionService.decrypt(
				integration.encryptedNotionIntegrationToken,
			);
		} catch (error) {
			console.error("Failed to decrypt Notion token:", error);
			throw new Error("Failed to process Notion integration token.");
		}

		// 3. Verify database access with Notion API
		try {
			const dbSchema = await this.notionApiService.getDatabaseSchema(
				input.notionDatabaseId,
				decryptedToken,
			);
			if (!dbSchema) {
				throw new Error(
					"Failed to access Notion database with the provided integration. Ensure the token is valid and has permissions to the database.",
				);
			}
		} catch (error: any) {
			// Catch errors from getDatabaseSchema (e.g., API errors, token invalid)
			console.error("Error verifying Notion database access:", error.message);
			throw new Error(
				`Failed to access Notion database: ${error.message || "Unknown error during schema retrieval."}`,
			);
		}

		// 4. Generate new ID for Template
		const id = uuidv4();

		// 5. Create Template entity
		const newTemplate = new Template(
			id,
			input.name,
			input.notionDatabaseId,
			input.body,
			input.conditions,
			input.destinationId,
			input.userId,
			// userNotionIntegrationId is the 8th argument in Template constructor, so pass it correctly
			// The constructor is: id, name, notionDBId, body, conditions, destId, userId, userNotionIntegrationId, createdAt, updatedAt
			// So we need to pass userNotionIntegrationId before createdAt and updatedAt if they are optional.
			// The current Template constructor expects userNotionIntegrationId *after* userId and *before* createdAt/updatedAt.
			input.userNotionIntegrationId, // Pass the new field
			undefined, // createdAt - let constructor default
			undefined, // updatedAt - let constructor default
		);
		
		// 6. Save Template entity
		await this.templateRepository.save(newTemplate);

		// 7. Return Output DTO
		return {
			id: newTemplate.id,
			name: newTemplate.name,
			notionDatabaseId: newTemplate.notionDatabaseId,
			body: newTemplate.body,
			conditions: newTemplate.conditions,
			destinationId: newTemplate.destinationId,
			userId: newTemplate.userId,
			userNotionIntegrationId: newTemplate.userNotionIntegrationId, // Include new field
			createdAt: newTemplate.createdAt,
			updatedAt: newTemplate.updatedAt,
		};
	}
}
