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

// NotionからのWebhookデータの型
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
		if (!pageProperties || Object.keys(pageProperties).length === 0) {
			console.warn(
				"ProcessNotionWebhookUseCase: pageProperties are missing or empty from webhook payload.",
				JSON.stringify(pageProperties, null, 2),
			);
		}

		console.log(
			`ProcessNotionWebhookUseCase: Successfully extracted databaseId: ${databaseId}`,
		);
		if (pageProperties) {
			console.log(
				"ProcessNotionWebhookUseCase: Extracted pageProperties keys:",
				Object.keys(pageProperties),
			);
		}

		// 1. データベーススキーマを取得 (キャッシュ経由)
		console.log(
			`ProcessNotionWebhookUseCase: Calling getDatabaseSchema for databaseId: ${databaseId}`,
		);
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
			console.log(
				"ProcessNotionWebhookUseCase: Successfully fetched database schema (potentially from cache).",
			);
		} catch (error) {
			console.error(
				`ProcessNotionWebhookUseCase: Error during getDatabaseSchema call for databaseId: ${databaseId}`,
				error,
			);
			return;
		}

		// 2. 該当データベースのテンプレートを取得
		console.log(
			`ProcessNotionWebhookUseCase: Fetching templates for databaseId: ${databaseId}`,
		);
		const templates: Template[] =
			await this.templateRepository.findByNotionDatabaseId(databaseId);
		console.log(
			`ProcessNotionWebhookUseCase: Found ${templates.length} templates for databaseId: ${databaseId}`,
		);

		if (templates.length === 0) {
			console.log(
				`ProcessNotionWebhookUseCase: No templates found for databaseId: ${databaseId}. Skipping further processing.`,
			);
			return;
		}

		// 3. 条件に一致するテンプレートを特定
		console.log("ProcessNotionWebhookUseCase: Starting template matching...");
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
		console.log(
			`ProcessNotionWebhookUseCase: Found ${matchedTemplates.length} matched templates.`,
		);
		for (const t of matchedTemplates) {
			console.log(` - Matched Template ID: ${t.id}, Name: ${t.name}`);
		}

		// 4. 条件に一致したテンプレートを使って通知メッセージを整形。
		console.log("ProcessNotionWebhookUseCase: Starting message formatting...");
		const messagesToSend: Array<{
			destinationId: string;
			body: string;
			templateName: string;
		}> = [];

		for (const template of matchedTemplates) {
			console.log(
				`ProcessNotionWebhookUseCase: Formatting message for template ID: ${template.id}, Name: ${template.name}`,
			);
			try {
				const formattedBody = await this.messageFormatterService.format(
					template.body,
					pageProperties || {},
					databaseSchema,
					pageUrl,
				);
				messagesToSend.push({
					destinationId: template.destinationId,
					body: formattedBody,
					templateName: template.name,
				});
				console.log(
					`ProcessNotionWebhookUseCase: Formatted message for template "${template.name}":\n${formattedBody}`,
				);
			} catch (formatError) {
				console.error(
					`ProcessNotionWebhookUseCase: Error formatting message for template ID ${template.id}:`,
					formatError,
				);
			}
		}

		if (messagesToSend.length === 0) {
			console.log(
				"ProcessNotionWebhookUseCase: No messages were formatted successfully. Nothing to send.",
			);
			return;
		}
		console.log(
			`ProcessNotionWebhookUseCase: Successfully formatted ${messagesToSend.length} messages.`,
		);

		// 5. 整形後のメッセージを、該当テンプレートに紐づく送信先へ通知。
		console.log(
			"ProcessNotionWebhookUseCase: Starting to send notifications...",
		);
		for (const messageInfo of messagesToSend) {
			console.log(
				`ProcessNotionWebhookUseCase: Preparing to send message for template "${messageInfo.templateName}" to destination ID: ${messageInfo.destinationId}`,
			);
			try {
				const destination = await this.destinationRepository.findById(
					messageInfo.destinationId,
				);
				if (!destination || !destination.webhookUrl) {
					console.error(
						`ProcessNotionWebhookUseCase: Destination or Webhook URL not found for destination ID: ${messageInfo.destinationId}. Skipping this message.`,
					);
					continue;
				}

				const payload: NotificationPayload = {
					content: messageInfo.body, // Discordの場合
					// text: messageInfo.body, // Teamsの場合
				};

				console.log(
					`ProcessNotionWebhookUseCase: Sending to "${destination.name || destination.webhookUrl}"`,
				);
				await this.notificationClient.send(destination.webhookUrl, payload);
				console.log(
					`ProcessNotionWebhookUseCase: Successfully sent notification for template "${messageInfo.templateName}" to destination "${destination.name || destination.id}".`,
				);
			} catch (sendError) {
				console.error(
					`ProcessNotionWebhookUseCase: Error sending notification for template "${messageInfo.templateName}" to destination ID ${messageInfo.destinationId}:`,
					sendError,
				);
			}
		}
		console.log(
			"ProcessNotionWebhookUseCase: All notification attempts finished.",
		);
	}
}
