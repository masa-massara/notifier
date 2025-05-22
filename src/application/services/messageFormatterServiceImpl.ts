// src/application/services/messageFormatterServiceImpl.ts
import { format as formatDateFn } from "date-fns"; // date-fnsからformat関数をインポート
import type { MessageFormatterService } from "../../domain/services/messageFormatterService";
import type {
	NotionDatabaseSchema,
	NotionPropertySchema,
} from "../../domain/services/notionApiService";

// Notionのページプロパティの実際の値の型 (より具体的に定義していくのが理想)
// biome-ignore lint/suspicious/noExplicitAny: <explanation>
type NotionPagePropertyValue = any;
type NotionPageProperties = Record<string, NotionPagePropertyValue>;

export class MessageFormatterServiceImpl implements MessageFormatterService {
	constructor() {
		console.log("MessageFormatterServiceImpl initialized.");
	}

	async format(
		templateBody: string,
		pageProperties: NotionPageProperties,
		databaseSchema: NotionDatabaseSchema,
		pageUrl?: string,
	): Promise<string> {
		console.log("MessageFormatterService: Starting to format message...");
		// console.debug('MessageFormatterService: Template body before formatting:', templateBody);
		// console.debug('MessageFormatterService: Page properties:', JSON.stringify(pageProperties, null, 2));
		// console.debug('MessageFormatterService: Database schema:', JSON.stringify(databaseSchema, null, 2));

		let formattedBody = templateBody;

		// 特殊プレースホルダの置換
		if (pageUrl) {
			formattedBody = formattedBody.replace(/{_pageUrl}/g, pageUrl);
		}
		formattedBody = formattedBody.replace(
			/{_databaseTitle}/g,
			databaseSchema.title || "",
		);
		try {
			formattedBody = formattedBody.replace(
				/{_now}/g,
				formatDateFn(new Date(), "yyyy/MM/dd HH:mm:ss"),
			);
		} catch (e) {
			console.warn(
				"MessageFormatterService: Failed to format {_now} placeholder",
				e,
			);
		}

		// データベースのプロパティに基づくプレースホルダの置換
		// databaseSchema.properties のキーはプロパティ名になってる想定
		for (const propertyNameInSchema in databaseSchema.properties) {
			const propertySchema = databaseSchema.properties[propertyNameInSchema];
			const placeholder = `{${propertySchema.name}}`; // プロパティ名をプレースホルダとする (例: {名前})

			if (formattedBody.includes(placeholder)) {
				const pagePropValueObject = pageProperties[propertySchema.name];
				let actualValueString = ""; // デフォルトは空文字列

				if (pagePropValueObject !== undefined && pagePropValueObject !== null) {
					switch (propertySchema.type) {
						case "title":
							actualValueString =
								pagePropValueObject.title
									// biome-ignore lint/suspicious/noExplicitAny: <explanation>
									?.map((rt: any) => rt.plain_text)
									.join("") || "";
							break;
						case "rich_text":
							actualValueString =
								pagePropValueObject.rich_text
									// biome-ignore lint/suspicious/noExplicitAny: <explanation>
									?.map((rt: any) => rt.plain_text)
									.join("") || "";
							break;
						case "number":
							actualValueString = String(pagePropValueObject.number ?? "");
							break;
						case "select":
							actualValueString = pagePropValueObject.select?.name || "";
							break;
						case "multi_select":
							actualValueString =
								pagePropValueObject.multi_select
									// biome-ignore lint/suspicious/noExplicitAny: <explanation>
									?.map((opt: any) => opt.name)
									.join(", ") || "";
							break;
						case "status":
							actualValueString = pagePropValueObject.status?.name || "";
							break;
						case "checkbox":
							actualValueString = pagePropValueObject.checkbox ? "✅" : "⬜";
							break;
						case "date":
							if (pagePropValueObject.date?.start) {
								try {
									actualValueString = formatDateFn(
										new Date(pagePropValueObject.date.start),
										"yyyy/MM/dd HH:mm",
									);
									if (pagePropValueObject.date.end) {
										actualValueString += ` ~ ${formatDateFn(new Date(pagePropValueObject.date.end), "yyyy/MM/dd HH:mm")}`;
									}
								} catch (e) {
									console.warn(
										`MessageFormatterService: Failed to format date for property "${propertySchema.name}"`,
										e,
									);
									actualValueString = pagePropValueObject.date.start;
								}
							} else {
								actualValueString = "";
							}
							break;
						case "people":
							actualValueString =
								pagePropValueObject.people
									// biome-ignore lint/suspicious/noExplicitAny: <explanation>
									?.map((person: any) => person.name || person.id) // Notion APIのpersonオブジェクトの構造による
									.join(", ") || "";
							break;
						case "files": // filesプロパティはファイル名のリストとかURLのリストとか仕様に合わせて
							actualValueString =
								pagePropValueObject.files
									// biome-ignore lint/suspicious/noExplicitAny: <explanation>
									?.map((file: any) => file.name || file.url) // ファイル名やURLなど
									.join(", ") || "";
							break;
						case "url":
							actualValueString = pagePropValueObject.url || "";
							break;
						case "email":
							actualValueString = pagePropValueObject.email || "";
							break;
						case "phone_number":
							actualValueString = pagePropValueObject.phone_number || "";
							break;
						// TODO: formula, relation, rollup, created_time, created_by, last_edited_time, last_edited_by なども必要なら
						default:
							console.warn(
								`MessageFormatterService: Unhandled property type "<span class="math-inline">\{propertySchema\.type\}" for placeholder "</span>{placeholder}". Attempting to stringify.`,
							);
							try {
								actualValueString = JSON.stringify(pagePropValueObject); // とりあえずJSON文字列化してみる
							} catch {
								actualValueString = `[Unhandled type: ${propertySchema.type}]`;
							}
							break;
					}
				}
				const regex = new RegExp(
					placeholder.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
					"g",
				);
				formattedBody = formattedBody.replace(regex, actualValueString);
			}
		}
		console.log(
			"MessageFormatterService: Template body after formatting:",
			formattedBody,
		);
		return formattedBody;
	}
}
