// src/domain/repositories/templateRepository.ts
import type { Template } from "../entities/template";

export interface TemplateRepository {
	save(template: Template): Promise<void>;

	findById(id: string, userId: string): Promise<Template | null>;

	// 特定のユーザーが所有する、指定されたNotionデータベースIDのテンプレートを取得
	findByNotionDatabaseId(
		notionDatabaseId: string,
		userId: string,
	): Promise<Template[]>;

	/**
	 * 指定されたNotionのデータベースIDに一致する全てのテンプレートを取得する（ユーザーを問わない）。
	 * 主にWebhook処理のように、特定のユーザーコンテキストなしに
	 * 関連する全てのテンプレートを処理する必要がある場合に使用する。
	 * @param notionDatabaseId NotionのデータベースID
	 */
	findAllByNotionDatabaseId(notionDatabaseId: string): Promise<Template[]>; // ★★★ この行を追加 ★★★

	deleteById(id: string, userId: string): Promise<void>;

	findAll(userId: string): Promise<Template[]>;
}
