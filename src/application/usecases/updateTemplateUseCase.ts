// src/application/usecases/updateTemplateUseCase.ts
import type {
	Template,
	TemplateCondition,
} from "../../domain/entities/template";
import type { TemplateRepository } from "../../domain/repositories/templateRepository";
import type { UserNotionIntegrationRepository } from "../../domain/repositories/userNotionIntegrationRepository"; // Added
import type { NotionApiService } from "../../domain/services/notionApiService"; // Added
import type { EncryptionService } from "../services/encryptionService"; // Added

export interface UpdateTemplateInput {
	id: string; // 更新対象のID (これは必須)
	userId: string; // ★★★ Input DTOにuserIdを追加 ★★★
	name?: string;
	notionDatabaseId?: string;
	body?: string;
	conditions?: TemplateCondition[];
	destinationId?: string;
	userNotionIntegrationId?: string | null; // Added
}

// ユースケースの出力 (更新後のテンプレート情報)
export type UpdateTemplateOutput = Template; // 更新されたTemplateエンティティを返す (userIdも含まれる)

export class UpdateTemplateUseCase {
	constructor(
		private readonly templateRepository: TemplateRepository,
		private readonly userNotionIntegrationRepository: UserNotionIntegrationRepository, // Added
		private readonly notionApiService: NotionApiService, // Added
		private readonly encryptionService: EncryptionService, // Added
	) {}

	async execute(input: UpdateTemplateInput): Promise<UpdateTemplateOutput> {
		// 1. まず、更新対象のテンプレートが存在するか、かつ操作ユーザーのものであるか確認
		// ★★★ findByIdにuserIdを渡す ★★★
		const existingTemplate = await this.templateRepository.findById(
			input.id,
			input.userId,
		);

		if (!existingTemplate) {
			// エラーメッセージも少し具体的にできるかも
			throw new Error(
				`Template with id ${input.id} not found or not accessible by user ${input.userId}.`,
			);
		}

		// 2. 入力された値でエンティティのプロパティを更新する
		let updated = false;

		// Helper function to get decrypted token
		const getDecryptedToken = async (integrationId: string | null, userId: string): Promise<string | null> => {
			if (!integrationId) return null;
			const integration = await this.userNotionIntegrationRepository.findById(integrationId, userId);
			if (!integration) throw new Error(`User Notion Integration with ID ${integrationId} not found or access denied.`);
			return this.encryptionService.decrypt(integration.notionIntegrationToken);
		};

		// Handling userNotionIntegrationId and notionDatabaseId updates
		const newNotionDatabaseId = input.notionDatabaseId !== undefined ? input.notionDatabaseId : existingTemplate.notionDatabaseId;
		let notionTokenForValidation: string | null = null;

		if (input.userNotionIntegrationId !== undefined) { // If userNotionIntegrationId is explicitly in input
			if (existingTemplate.userNotionIntegrationId !== input.userNotionIntegrationId) {
				if (input.userNotionIntegrationId === null) { // Setting to null
					notionTokenForValidation = null; // No token to validate with if setting to null
				} else { // Changing to a new integration ID
					notionTokenForValidation = await getDecryptedToken(input.userNotionIntegrationId, input.userId);
					if (!notionTokenForValidation) {
						// This case should be handled by getDecryptedToken throwing an error, but as a safeguard:
						throw new Error(`Failed to retrieve token for User Notion Integration ID ${input.userNotionIntegrationId}.`);
					}
				}
				existingTemplate.userNotionIntegrationId = input.userNotionIntegrationId;
				updated = true;
			} else { // Integration ID is the same, but maybe notionDatabaseId is changing
				notionTokenForValidation = await getDecryptedToken(existingTemplate.userNotionIntegrationId, input.userId);
			}
		} else if (input.notionDatabaseId !== undefined && existingTemplate.notionDatabaseId !== input.notionDatabaseId) {
			// Only notionDatabaseId is changing, use existing token if available
			notionTokenForValidation = await getDecryptedToken(existingTemplate.userNotionIntegrationId, input.userId);
		}

		if (input.name !== undefined && existingTemplate.name !== input.name) {
			existingTemplate.updateName(input.name); // Templateエンティティのメソッドを呼ぶ
			updated = true;
		}

		if (input.notionDatabaseId !== undefined && existingTemplate.notionDatabaseId !== input.notionDatabaseId) {
			existingTemplate.notionDatabaseId = input.notionDatabaseId;
			updated = true;
		}

		// If notionDatabaseId changed OR userNotionIntegrationId changed (and is not null), re-validate schema
		if (notionTokenForValidation && (updated || (input.userNotionIntegrationId !== undefined && input.userNotionIntegrationId !== null))) {
			const schema = await this.notionApiService.getDatabaseSchema(newNotionDatabaseId, notionTokenForValidation);
			if (!schema) {
				throw new Error(`Notion database with ID ${newNotionDatabaseId} not found or schema is inaccessible with the provided/existing Notion integration.`);
			}
			// TODO: Optionally, validate if the schema.properties align with template conditions if needed here.
		} else if (input.userNotionIntegrationId !== undefined && input.userNotionIntegrationId === null && existingTemplate.userNotionIntegrationId !== null) {
			// If integration is being set to null, no schema validation with token needed
			existingTemplate.userNotionIntegrationId = null;
			updated = true;
		}


		if (input.body !== undefined && existingTemplate.body !== input.body) {
			existingTemplate.body = input.body;
			updated = true;
		}
		if (input.conditions !== undefined) {
			// conditionsの比較は少し複雑なので、ここでは単純に更新
			existingTemplate.conditions = input.conditions;
			updated = true;
		}
		if (
			input.destinationId !== undefined &&
			existingTemplate.destinationId !== input.destinationId
		) {
			existingTemplate.destinationId = input.destinationId;
			updated = true;
		}
		
		// Update userNotionIntegrationId if it was part of the input and changed
		// This specific assignment is now handled earlier to ensure token is available for schema validation
		// if (input.userNotionIntegrationId !== undefined && existingTemplate.userNotionIntegrationId !== input.userNotionIntegrationId) {
		// 	existingTemplate.userNotionIntegrationId = input.userNotionIntegrationId;
		// 	updated = true;
		// }


		// もし何かしら更新があった場合のみ、updatedAtを更新し、保存する
		if (updated) {
			existingTemplate.updatedAt = new Date(); // updatedAtも更新
			// 3. 更新したエンティティをリポジトリで保存する
			await this.templateRepository.save(existingTemplate);
		}

		// 4. 更新後のエンティティを返す
		return existingTemplate;
	}
}
