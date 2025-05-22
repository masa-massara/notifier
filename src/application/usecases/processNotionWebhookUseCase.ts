// src/application/usecases/processNotionWebhookUseCase.ts
import type { TemplateRepository } from "../../domain/repositories/templateRepository";
import type { DestinationRepository } from "../../domain/repositories/destinationRepository";
import type {
	NotionApiService,
	NotionDatabaseSchema,
} from "../../domain/services/notionApiService";
import type { Template } from "../../domain/entities/template";
import { findMatchingTemplates } from "../../domain/services/templateMatcherService"; // ★★★ これをインポート！

export interface ProcessNotionWebhookInput {
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	[key: string]: any;
}

export class ProcessNotionWebhookUseCase {
	constructor(
		private readonly templateRepository: TemplateRepository,
		private readonly destinationRepository: DestinationRepository,
		private readonly notionApiService: NotionApiService,
	) {}

	async execute(input: ProcessNotionWebhookInput): Promise<void> {
		console.log(/* ... 受信ログ ... */);

		const notionPageData = input.data;
		let databaseId: string | undefined = undefined;
		if (notionPageData?.parent?.type === "database_id") {
			databaseId = notionPageData.parent.database_id;
		}
		const pageProperties = notionPageData?.properties;

		if (!databaseId) {
			console.error(/* ... databaseIdなしエラー ... */);
			return;
		}
		if (!pageProperties || Object.keys(pageProperties).length === 0) {
			console.error(/* ... pagePropertiesなしエラー ... */);
			return;
		}

		console.log(/* ... databaseIdとpagePropertiesキーのログ ... */);

		let databaseSchema: NotionDatabaseSchema | null = null;
		try {
			databaseSchema =
				await this.notionApiService.getDatabaseSchema(databaseId);
			if (!databaseSchema) {
				console.error(/* ... スキーマ取得失敗エラー ... */);
				return;
			}
			console.log(/* ... スキーマ取得成功ログ ... */);
		} catch (error) {
			console.error(/* ... スキーマ取得中のエラー ... */);
			return;
		}

		console.log(
			`ProcessNotionWebhookUseCase: Fetching templates for databaseId: ${databaseId}`,
		);
		const templates: Template[] =
			await this.templateRepository.findByNotionDatabaseId(databaseId);
		console.log(
			`ProcessNotionWebhookUseCase: Found ${templates.length} templates for databaseId: ${databaseId}`,
		);

		if (templates.length === 0) {
			console.log(/* ... テンプレートなしログ ... */);
			return;
		}

		// ↓↓↓ ここで findMatchingTemplates を呼び出す！ ↓↓↓
		console.log("ProcessNotionWebhookUseCase: Starting template matching...");
		const matchedTemplates = findMatchingTemplates(
			pageProperties,
			templates,
			databaseSchema,
		);

		if (matchedTemplates.length === 0) {
			console.log(
				`ProcessNotionWebhookUseCase: No templates matched the conditions for databaseId: ${databaseId}.`,
			);
			return;
		}
		console.log(
			`ProcessNotionWebhookUseCase: Found ${matchedTemplates.length} matched templates.`,
		);
		for (const t of matchedTemplates) {
			console.log(` - Matched Template ID: ${t.id}, Name: ${t.name}`);
		}

		// TODO: 3. 条件に一致したテンプレートを使って通知メッセージを整形。
		// const formattedMessages = formatMessages(pageProperties, matchedTemplates, databaseSchema);

		// TODO: 4. 整形後のメッセージを、該当テンプレートに紐づく送信先へ通知。
		// await sendNotifications(formattedMessages, this.destinationRepository, /* notificationClient */);

		console.log(
			"ProcessNotionWebhookUseCase: Processing finished (template matching attempted).",
		);
	}
}
