// src/application/usecases/processNotionWebhookUseCase.ts
import type { TemplateRepository } from "../../domain/repositories/templateRepository";
import type { DestinationRepository } from "../../domain/repositories/destinationRepository";
import type {
	NotionApiService,
	NotionDatabaseSchema,
} from "../../domain/services/notionApiService";
import type { Template } from "../../domain/entities/template";
import { findMatchingTemplates } from "../../domain/services/templateMatcherService";
import type { MessageFormatterService } from "../../domain/services/messageFormatterService";
import type {
	NotificationClient,
	NotificationPayload,
} from "../../domain/services/notificationClient";

// NotionからのWebhookデータの型 (変更なし)
// biome-ignore lint/suspicious/noExplicitAny: <explanation>
type NotionPageProperties = Record<string, any>;
export interface ProcessNotionWebhookInputData {
	object: string;
	id: string;
	parent?: {
		type: string;
		database_id?: string;
		page_id?: string;
		workspace?: boolean;
	};
	properties?: NotionPageProperties;
	url?: string;
}
export interface ProcessNotionWebhookInput {
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	source?: Record<string, any>;
	data?: ProcessNotionWebhookInputData;
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	[key: string]: any;
}

export class ProcessNotionWebhookUseCase {
	constructor(
		private readonly templateRepository: TemplateRepository,
		private readonly destinationRepository: DestinationRepository,
		private readonly notionApiService: NotionApiService,
		private readonly messageFormatterService: MessageFormatterService,
		private readonly notificationClient: NotificationClient,
	) {}

	async execute(input: ProcessNotionWebhookInput): Promise<void> {
		console.log("ProcessNotionWebhookUseCase: Received webhook input");

		const notionData = input.data;
		if (!notionData) {
			console.error(
				"ProcessNotionWebhookUseCase: 'data' field is missing in webhook input.",
			);
			return;
		}

		let databaseId: string | undefined = undefined;
		if (notionData.parent?.type === "database_id") {
			databaseId = notionData.parent.database_id;
		}

		const pageProperties = notionData.properties;
		const pageUrl = notionData.url;

		if (!databaseId) {
			console.error(
				"ProcessNotionWebhookUseCase: Failed to extract databaseId from webhook payload.",
				JSON.stringify(notionData.parent, null, 2),
			);
			return;
		}
		// pagePropertiesのチェックは現状維持

		console.log(
			`ProcessNotionWebhookUseCase: Successfully extracted databaseId: ${databaseId}`,
		);
		// pagePropertiesのログも現状維持

		// 1. データベーススキーマを取得 (変更なし)
		let databaseSchema: NotionDatabaseSchema | null = null;
		try {
			databaseSchema =
				await this.notionApiService.getDatabaseSchema(databaseId);
			if (!databaseSchema) {
				console.error(
					`ProcessNotionWebhookUseCase: Failed to fetch database schema for databaseId: ${databaseId}. Schema is null.`,
				);
				return;
			}
		} catch (error) {
			console.error(
				`ProcessNotionWebhookUseCase: Error during getDatabaseSchema call for databaseId: ${databaseId}`,
				error,
			);
			return;
		}

		// 2. 該当データベースのテンプレートを取得
		console.log(
			`ProcessNotionWebhookUseCase: Fetching all templates for databaseId: ${databaseId}`,
		);
		// ★★★ 修正点1: findAllByNotionDatabaseId (仮の新しいメソッド名) を使用 ★★★
		// このメソッドは TemplateRepository インターフェースと実装に追加する必要があるで
		const templates: Template[] =
			await this.templateRepository.findAllByNotionDatabaseId(databaseId);
		console.log(
			`ProcessNotionWebhookUseCase: Found ${templates.length} templates for databaseId: ${databaseId}`,
		);

		if (templates.length === 0) {
			console.log(
				`ProcessNotionWebhookUseCase: No templates found for databaseId: ${databaseId}. Skipping further processing.`,
			);
			return;
		}

		// 3. 条件に一致するテンプレートを特定 (変更なし)
		const matchedTemplates = findMatchingTemplates(
			pageProperties || {},
			templates,
			databaseSchema,
		);

		if (matchedTemplates.length === 0) {
			console.log(
				`ProcessNotionWebhookUseCase: No templates matched the conditions for databaseId: ${databaseId}.`,
			);
			return;
		}
		// matchedTemplatesのログも現状維持

		// 4. 条件に一致したテンプレートを使って通知メッセージを整形。(変更なし)
		const messagesToSend: Array<{
			destinationId: string;
			templateUserId: string; // ★★★ マッチしたテンプレートの所有者userIdを保持 ★★★
			body: string;
			templateName: string;
		}> = [];

		for (const template of matchedTemplates) {
			try {
				const formattedBody = await this.messageFormatterService.format(
					template.body,
					pageProperties || {},
					databaseSchema,
					pageUrl,
				);
				messagesToSend.push({
					destinationId: template.destinationId,
					templateUserId: template.userId, // ★★★ templateからuserIdを取得して格納 ★★★
					body: formattedBody,
					templateName: template.name,
				});
			} catch (formatError) {
				console.error(
					`ProcessNotionWebhookUseCase: Error formatting message for template ID ${template.id}:`,
					formatError,
				);
			}
		}

		if (messagesToSend.length === 0) {
			// ログは現状維持
			return;
		}
		// formatted messagesのログも現状維持

		// 5. 整形後のメッセージを、該当テンプレートに紐づく送信先へ通知。
		console.log(
			"ProcessNotionWebhookUseCase: Starting to send notifications...",
		);
		for (const messageInfo of messagesToSend) {
			try {
				// ★★★ 修正点2: destinationRepository.findById に templateUserId を渡す ★★★
				const destination = await this.destinationRepository.findById(
					messageInfo.destinationId,
					messageInfo.templateUserId, // 送信先は、テンプレートの所有者のものを取得
				);
				if (!destination || !destination.webhookUrl) {
					console.error(
						`ProcessNotionWebhookUseCase: Destination or Webhook URL not found for destination ID: ${messageInfo.destinationId} (User: ${messageInfo.templateUserId}). Skipping this message.`,
					);
					continue;
				}

				const payload: NotificationPayload = {
					content: messageInfo.body,
				};

				await this.notificationClient.send(destination.webhookUrl, payload);
				// 成功ログは現状維持
			} catch (sendError) {
				console.error(
					`ProcessNotionWebhookUseCase: Error sending notification for template "${messageInfo.templateName}" to destination ID ${messageInfo.destinationId} (User: ${messageInfo.templateUserId}):`,
					sendError,
				);
			}
		}
		console.log(
			"ProcessNotionWebhookUseCase: All notification attempts finished.",
		);
	}
}
