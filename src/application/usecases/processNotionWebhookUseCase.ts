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
import type { UserNotionIntegrationRepository } from "../../domain/repositories/userNotionIntegrationRepository"; // Added
import type { EncryptionService } from "../../domain/services/encryptionService"; // Added

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
		private readonly userNotionIntegrationRepository: UserNotionIntegrationRepository, // Added
		private readonly encryptionService: EncryptionService, // Added
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

		// 1. Fetch all templates for the databaseId
		console.log(
			`ProcessNotionWebhookUseCase: Fetching all templates for databaseId: ${databaseId}`,
		);
		const allTemplatesForDb: Template[] =
			await this.templateRepository.findAllByNotionDatabaseId(databaseId);
		console.log(
			`ProcessNotionWebhookUseCase: Found ${allTemplatesForDb.length} templates for databaseId: ${databaseId}`,
		);

		if (allTemplatesForDb.length === 0) {
			console.log(
				`ProcessNotionWebhookUseCase: No templates found for databaseId: ${databaseId}. Skipping further processing.`,
			);
			return;
		}

		// 2. Find a valid token and fetch database schema
		let databaseSchema: NotionDatabaseSchema | null = null;
		let tokenToUseForSchema: string | null = null;

		console.log(`ProcessNotionWebhookUseCase: Attempting to find a usable Notion token for databaseId: ${databaseId}`);
		for (const tpl of allTemplatesForDb) {
			if (tpl.userNotionIntegrationId && tpl.userId) {
				console.log(`ProcessNotionWebhookUseCase: Checking template ID ${tpl.id} (User: ${tpl.userId}, IntegrationID: ${tpl.userNotionIntegrationId}) for token.`);
				const integration = await this.userNotionIntegrationRepository.findById(tpl.userNotionIntegrationId, tpl.userId);
				if (integration && integration.encryptedNotionIntegrationToken) {
					try {
						tokenToUseForSchema = await this.encryptionService.decrypt(integration.encryptedNotionIntegrationToken);
						console.log(`ProcessNotionWebhookUseCase: Successfully decrypted token from integration ${integration.id} for user ${tpl.userId}.`);
						break; // Found a token, exit loop
					} catch (decryptionError) {
						console.error(`ProcessNotionWebhookUseCase: Failed to decrypt token for integration ${integration.id} of user ${tpl.userId}. Error:`, decryptionError);
						// Continue to try other templates' tokens
					}
				} else {
					console.log(`ProcessNotionWebhookUseCase: Integration ${tpl.userNotionIntegrationId} for user ${tpl.userId} not found or has no token.`);
				}
			} else {
				console.log(`ProcessNotionWebhookUseCase: Template ID ${tpl.id} does not have userNotionIntegrationId or userId. Skipping for token search.`);
			}
		}

		if (!tokenToUseForSchema) {
			console.error(`ProcessNotionWebhookUseCase: No valid Notion token found for databaseId: ${databaseId} among ${allTemplatesForDb.length} associated templates. Cannot fetch schema.`);
			return; // Cannot proceed without a token for schema
		}

		console.log(`ProcessNotionWebhookUseCase: Attempting to fetch schema for databaseId: ${databaseId} using a user token.`);
		try {
			databaseSchema = await this.notionApiService.getDatabaseSchema(databaseId, tokenToUseForSchema);
		} catch (error) {
			console.error(`ProcessNotionWebhookUseCase: Error during getDatabaseSchema call for databaseId: ${databaseId} using a user token. Error:`, error);
			return;
		}

		if (!databaseSchema) {
			console.error(`ProcessNotionWebhookUseCase: Failed to fetch database schema for databaseId: ${databaseId} using a user token. Schema is null.`);
			return;
		}
		console.log(`ProcessNotionWebhookUseCase: Successfully fetched schema for databaseId: ${databaseId}.`);

		// 3. Identify matching templates using allTemplatesForDb
		const matchedTemplates = findMatchingTemplates(
			pageProperties || {},
			allTemplatesForDb, // Use all templates fetched earlier
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
