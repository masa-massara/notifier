// src/application/usecases/createTemplateUseCase.ts
import {
	Template,
	type TemplateCondition,
} from "../../domain/entities/template";
import type { TemplateRepository } from "../../domain/repositories/templateRepository";
import type { UserNotionIntegrationRepository } from "../../domain/repositories/userNotionIntegrationRepository"; // Added
import type { NotionApiService } from "../../domain/services/notionApiService"; // Added
import type { EncryptionService } from "../services/encryptionService"; // Added
import { v4 as uuidv4 } from "uuid"; // ID生成用

// ユースケースに入力されるデータのための型 (DTO: Data Transfer Object)
export interface CreateTemplateInput {
	name: string;
	notionDatabaseId: string;
	body: string;
	conditions: TemplateCondition[]; // Templateエンティティで定義した型を使う
	destinationId: string;
	userId: string; // ★★★ Input DTOにuserIdを追加 ★★★
	userNotionIntegrationId: string; // Added: ID of the UserNotionIntegration to use
}

// ユースケースが出力するデータのための型 (DTO) - 作成されたテンプレートを返す場合
export interface CreateTemplateOutput {
	id: string;
	name: string;
	notionDatabaseId: string;
	body: string;
	conditions: TemplateCondition[];
	destinationId: string;
	userId: string; // ★★★ Output DTOにuserIdを追加 ★★★
	userNotionIntegrationId: string | null; // Added
	createdAt: Date;
	updatedAt: Date;
}

export class CreateTemplateUseCase {
	constructor(
		private readonly templateRepository: TemplateRepository,
		private readonly userNotionIntegrationRepository: UserNotionIntegrationRepository, // Added
		private readonly notionApiService: NotionApiService, // Added
		private readonly encryptionService: EncryptionService, // Added
	) {}

	async execute(input: CreateTemplateInput): Promise<CreateTemplateOutput> {
		// 0. Fetch and decrypt Notion token
		const userIntegration = await this.userNotionIntegrationRepository.findById(input.userNotionIntegrationId, input.userId);
		if (!userIntegration) {
			throw new Error(`User Notion Integration with ID ${input.userNotionIntegrationId} not found or access denied.`);
		}
		const decryptedNotionToken = await this.encryptionService.decrypt(userIntegration.notionIntegrationToken);

		// 0.1 Validate Notion Database ID using the fetched token
		const schema = await this.notionApiService.getDatabaseSchema(input.notionDatabaseId, decryptedNotionToken);
		if (!schema) {
			throw new Error(`Notion database with ID ${input.notionDatabaseId} not found or schema is inaccessible.`);
		}
		// TODO: Optionally, validate if the schema.properties align with template conditions if needed here.

		// 1. 新しいIDを生成
		const id = uuidv4();

		// 2. Templateエンティティを作成
		const newTemplate = new Template(
			id,
			input.name,
			input.notionDatabaseId,
			input.body,
			input.conditions,
			input.destinationId,
			input.userId, // ★★★ エンティティ生成時にuserIdを渡す ★★★
			input.userNotionIntegrationId, // Pass userNotionIntegrationId to Template constructor
			// createdAt と updatedAt はエンティティのコンストラクタでデフォルト値が設定される
		);

		// 3. リポジトリを使ってエンティティを保存
		await this.templateRepository.save(newTemplate);

		// 4. 保存されたエンティティの情報をOutput DTOとして返す
		return {
			id: newTemplate.id,
			name: newTemplate.name,
			notionDatabaseId: newTemplate.notionDatabaseId,
			body: newTemplate.body,
			conditions: newTemplate.conditions,
			destinationId: newTemplate.destinationId,
			userId: newTemplate.userId, // ★★★ OutputにもuserIdを含める ★★★
			userNotionIntegrationId: newTemplate.userNotionIntegrationId, // Added to output
			createdAt: newTemplate.createdAt,
			updatedAt: newTemplate.updatedAt,
		};
	}
}
