// src/domain/services/notionApiService.ts

// Notionデータベースのプロパティ情報を表す型 (これは具体的に定義していく)
export interface NotionPropertySchema {
	id: string;
	name: string;
	type: string; // 例: "title", "rich_text", "number", "select", "multi_select", "date", "status", etc.
	options?: Array<{ id: string; name: string; color?: string }>; // select, multi_select, status の場合
	// 他にもプロパティの型に応じて必要な情報があれば追加
}

// Notionデータベース全体のスキーマ情報を表す型
export interface NotionDatabaseSchema {
	id: string;
	title: string; // データベースのタイトル
	properties: Record<string, NotionPropertySchema>; // プロパティ名やIDをキーにしたプロパティ情報
	// 他にも必要な情報があれば追加 (例: parent情報とか)
}

// Notion APIとやり取りするサービスのインターフェース
export interface NotionApiService {
	/**
	 * 指定されたデータベースIDのスキーマ情報（プロパティ定義など）を取得する
	 * @param databaseId 取得対象のNotionデータベースID
	 * @returns データベーススキーマ情報、または見つからない場合はnull
	 */
	getDatabaseSchema(databaseId: string): Promise<NotionDatabaseSchema | null>;

	// 今後、もしNotionからページ情報を直接取得する必要が出てきたら、こんなメソッドも追加するかもしれんな
	// getPageProperties(pageId: string): Promise<Record<string, any> | null>;
}
