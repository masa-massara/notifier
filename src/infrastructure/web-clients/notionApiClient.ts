// src/infrastructure/web-clients/notionApiClient.ts (または application/services/notionApiService.ts)
import { Client } from "@notionhq/client";
import type {
	GetDatabaseResponse,
	DatabaseObjectResponse,
} from "@notionhq/client/build/src/api-endpoints";
import type {
	NotionApiService,
	NotionDatabaseSchema,
	NotionPropertySchema,
} from "../../domain/services/notionApiService";
import type { CacheService } from "../../application/services/cacheService"; // ★ CacheService をインポート

const CACHE_TTL_SECONDS = 1800; // 例: 30分キャッシュ (30 * 60)

export class NotionApiClient implements NotionApiService {
	private notion: Client;
	private notionIntegrationToken: string;
	private cacheService: CacheService; // ★ CacheService を保持するプロパティ

	constructor(notionIntegrationToken: string, cacheService: CacheService) {
		// ★ 引数に cacheService を追加
		if (!notionIntegrationToken) {
			throw new Error(
				"Notion integration token is required for NotionApiClient.",
			);
		}
		this.notionIntegrationToken = notionIntegrationToken;
		this.notion = new Client({ auth: this.notionIntegrationToken });
		this.cacheService = cacheService; // ★ cacheService をプロパティに設定
		console.log("NotionApiClient initialized with CacheService.");
	}

	async getDatabaseSchema(
		databaseId: string,
	): Promise<NotionDatabaseSchema | null> {
		const cacheKey = `notion_db_schema_${databaseId}`; // キャッシュ用のキー

		// 1. まずキャッシュを確認
		const cachedSchema =
			await this.cacheService.get<NotionDatabaseSchema>(cacheKey);
		if (cachedSchema) {
			console.log(
				`NotionApiClient: Cache hit for database schema ID: ${databaseId}`,
			);
			return cachedSchema;
		}
		console.log(
			`NotionApiClient: Cache miss for database schema ID: ${databaseId}. Fetching from API...`,
		);

		// 2. キャッシュになければAPIから取得
		try {
			const response = await this.notion.databases.retrieve({
				database_id: databaseId,
			});

			if (
				response.object !== "database" ||
				!("title" in response) ||
				!("properties" in response)
			) {
				console.error(
					"NotionApiClient: Response is not a full database object for schema.",
				);
				return null;
			}
			// ★ mapResponseToSchema に渡す前に、response が DatabaseObjectResponse 型であることを保証する
			// (型ガードやアサーションが適切に行われている前提)
			const schema = this.mapResponseToSchema(
				response as DatabaseObjectResponse,
			);

			// 3. 取得したデータをキャッシュに保存
			if (schema) {
				await this.cacheService.set(cacheKey, schema, CACHE_TTL_SECONDS);
				console.log(
					`NotionApiClient: Schema for ${databaseId} saved to cache.`,
				);
			}
			return schema;
			// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		} catch (error: any) {
			console.error(
				`NotionApiClient: Error fetching database schema for ID ${databaseId}:`,
				error.code || error.name,
				error.body || error.message,
			);
			if (error.code === "object_not_found" || error.status === 404) {
				return null;
			}
			throw error;
		}
	}

	// mapResponseToSchema メソッドは前回修正したやつをそのまま使う
	private mapResponseToSchema(
		response: DatabaseObjectResponse,
	): NotionDatabaseSchema {
		const databaseTitle =
			Array.isArray(response.title) && response.title.length > 0
				? response.title.map((t) => t.plain_text).join("")
				: "Untitled Database";

		const properties: Record<string, NotionPropertySchema> = {};
		for (const [propertyName, propData] of Object.entries(
			response.properties,
		)) {
			let optionsArray:
				| Array<{ id: string; name: string; color?: string }>
				| undefined = undefined;
			if (propData.type === "select" && propData.select) {
				optionsArray = propData.select.options.map((opt) => ({
					id: opt.id,
					name: opt.name,
					color: opt.color,
				}));
			} else if (propData.type === "multi_select" && propData.multi_select) {
				optionsArray = propData.multi_select.options.map((opt) => ({
					id: opt.id,
					name: opt.name,
					color: opt.color,
				}));
			} else if (propData.type === "status" && propData.status) {
				optionsArray = propData.status.options.map((opt) => ({
					id: opt.id,
					name: opt.name,
					color: opt.color,
				}));
			}
			properties[propertyName] = {
				id: propData.id,
				name: propData.name,
				type: propData.type,
				options: optionsArray,
			};
		}
		return {
			id: response.id,
			title: databaseTitle,
			properties: properties,
		};
	}
}
