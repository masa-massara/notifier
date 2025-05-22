// src/domain/services/messageFormatterService.ts
import type { NotionDatabaseSchema } from "./notionApiService"; // Notionの型をインポート
// NotionPageProperties もインポート (templateMatcherService.ts で定義した型を共通化してもええ)
// biome-ignore lint/suspicious/noExplicitAny: <explanation>
type NotionPagePropertyValue = any;
type NotionPageProperties = Record<string, NotionPagePropertyValue>;

export interface FormattedMessageResult {
	body: string; // 整形後のメッセージ本文
	// 他にも整形結果として必要な情報があれば追加 (例: 送信先情報とか)
}

export interface MessageFormatterService {
	/**
	 * テンプレート本文のプレースホルダを実際のページプロパティ値で置換する
	 * @param templateBody プレースホルダを含むテンプレートの本文
	 * @param pageProperties Webhookで受信したページのプロパティ
	 * @param databaseSchema 対象データベースのスキーマ情報
	 * @param pageUrl (オプション) NotionページのURL
	 * @returns 整形済みのメッセージ本文
	 */
	format(
		templateBody: string,
		pageProperties: NotionPageProperties,
		databaseSchema: NotionDatabaseSchema,
		pageUrl?: string, // 特殊プレースホルダ {_pageUrl} のために追加
	): Promise<string>; // 将来的に非同期処理が入る可能性も考慮してPromiseにしとく
}
