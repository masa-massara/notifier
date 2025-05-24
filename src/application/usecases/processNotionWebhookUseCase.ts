// src/application/usecases/processNotionWebhookUseCase.ts
import type { TemplateRepository } from "../../domain/repositories/templateRepository";
import type { DestinationRepository } from "../../domain/repositories/destinationRepository";
import type {
	NotionApiService,
	NotionDatabaseSchema,
} from "../../domain/services/notionApiService";
import type { UserNotionIntegrationRepository } from "../../domain/repositories/userNotionIntegrationRepository"; // Added
import type { EncryptionService } from "../services/encryptionService"; // Added
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

		// 1. Fetch all templates for the given databaseId
		console.log(
			`ProcessNotionWebhookUseCase: Fetching all templates for databaseId: ${databaseId}.`,
		);
		const templates: Template[] =
			await this.templateRepository.findAllByNotionDatabaseId(databaseId);

		if (templates.length === 0) {
			console.log(
				`ProcessNotionWebhookUseCase: No templates found for databaseId: ${databaseId}. Skipping processing.`,
			);
			return;
		}
		console.log(
			`ProcessNotionWebhookUseCase: Found ${templates.length} templates for databaseId: ${databaseId}.`,
		);

		// New Token Retrieval and Schema Fetching Logic
		let databaseSchema: NotionDatabaseSchema | null = null;
		let tokenUsedForSchema: string | null = null; // To keep track of which token was used (optional)

		for (const template of templates) {
			if (!template.userNotionIntegrationId) {
				console.log(
					`ProcessNotionWebhookUseCase: Template ID ${template.id} (User: ${template.userId}) has no Notion integration configured. Skipping for token retrieval.`,
				);
				continue;
			}

			let userIntegration;
			try {
				userIntegration = await this.userNotionIntegrationRepository.findById(
					template.userNotionIntegrationId,
					template.userId,
				);
			} catch (repoError) {
				console.error(
					`ProcessNotionWebhookUseCase: Error fetching UserNotionIntegration ID ${template.userNotionIntegrationId} for Template ID ${template.id} (User: ${template.userId}):`, repoError
				);
				continue; // Try next template
			}
			
			if (!userIntegration) {
				console.warn(
					`ProcessNotionWebhookUseCase: UserNotionIntegration ID ${template.userNotionIntegrationId} not found for Template ID ${template.id} (User: ${template.userId}). Skipping for token retrieval.`,
				);
				continue;
			}

			let decryptedToken: string;
			try {
				decryptedToken = await this.encryptionService.decrypt(userIntegration.notionIntegrationToken);
			} catch (decryptionError) {
				console.error(
					`ProcessNotionWebhookUseCase: Failed to decrypt Notion token for UserNotionIntegration ID ${userIntegration.id} (Template ID ${template.id}, User: ${template.userId}):`,
					decryptionError,
				);
				continue; // Try next template
			}

			if (databaseSchema === null) { // Only attempt to fetch schema if not already fetched
				console.log(
					`ProcessNotionWebhookUseCase: Attempting to fetch schema for databaseId ${databaseId} using token from UserNotionIntegration ID ${userIntegration.id} (Template ID ${template.id}).`
				);
				try {
					databaseSchema = await this.notionApiService.getDatabaseSchema(databaseId, decryptedToken);
					if (databaseSchema) {
						tokenUsedForSchema = decryptedToken; // Optional: store which token worked
						console.log(
							`ProcessNotionWebhookUseCase: Successfully fetched database schema for ${databaseId} using token from UserNotionIntegration ID ${userIntegration.id}.`
						);
						break; // Schema fetched, no need to try other tokens/templates
					} else {
						// This case might not be hit if getDatabaseSchema throws an error on failure or returns null for "not found" which is handled by the catch.
						// However, if it returns null for other reasons (e.g. unexpected API response but not an outright error):
						console.warn(
							`ProcessNotionWebhookUseCase: Fetching schema for databaseId ${databaseId} with token from UserNotionIntegration ID ${userIntegration.id} returned null (no error thrown).`
						);
					}
				} catch (schemaError) {
					console.error(
						`ProcessNotionWebhookUseCase: Error fetching schema for databaseId ${databaseId} with token from UserNotionIntegration ID ${userIntegration.id} (Template ID ${template.id}):`,
						schemaError,
					);
					// Schema remains null, loop will continue to try next template's token if any.
				}
			} else {
				// This else block is technically not needed because of the 'break' statement above.
				// If schema is already fetched, we would have exited the loop.
				break; 
			}
		}

		if (databaseSchema === null) {
			console.error(
				`ProcessNotionWebhookUseCase: Could not retrieve database schema for ${databaseId} using any of the configured user tokens from ${templates.length} templates. Webhook processing cannot continue.`,
			);
			return;
		}

		// Template Matching (uses the fetched databaseSchema)
		const matchedTemplates = findMatchingTemplates(
			pageProperties || {},
			templates, // All templates for the databaseId are passed
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
