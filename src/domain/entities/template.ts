// src/domain/entities/template.ts

// まずは、条件を表す型を定義しとこか
// （これはエンティティとは別に、値オブジェクトとして src/domain/value-objects/ とかに置いてもええかもな）
export type TemplateConditionOperator =
	| "="
	| "!="
	| "in"
	| "<"
	| ">"
	| "is_empty"
	| "is_not_empty";

export interface TemplateCondition {
	propertyId: string; // NotionのプロパティID (名前やなくてIDで管理する方が確実)
	operator: TemplateConditionOperator;
	value: string | number | string[]; // 値。演算子によって型が変わるかもしれんな
}

// Templateエンティティの定義
export class Template {
	public readonly id: string; // UUIDとかで一意に識別できるようにする
	public name: string;
	public notionDatabaseId: string; // NotionのデータベースID
	public body: string; // プレースホルダを含む本文
	public conditions: TemplateCondition[]; // AND条件のリスト
	public destinationId: string; // 送信先のID (Destinationエンティティと繋がる)
	public readonly userId: string;
	public userNotionIntegrationId: string | null; // Added: Link to UserNotionIntegration
	public createdAt: Date;
	public updatedAt: Date;

	constructor(
		id: string,
		name: string,
		notionDatabaseId: string,
		body: string,
		conditions: TemplateCondition[],
		destinationId: string,
		userId: string,
		userNotionIntegrationId: string | null = null, // Added, defaults to null
		createdAt?: Date,
		updatedAt?: Date,
	) {
		this.id = id;
		this.name = name;
		this.notionDatabaseId = notionDatabaseId;
		this.body = body;
		this.conditions = conditions;
		this.destinationId = destinationId;
		this.userId = userId;
		this.userNotionIntegrationId = userNotionIntegrationId; // Added
		this.createdAt = createdAt || new Date();
		this.updatedAt = updatedAt || new Date();

		// ここでバリデーション（例えばnameが空じゃないかとか）を入れてもええで
		// if (!name) {
		//   throw new Error("Template name cannot be empty.");
		// }
	}

	// Templateエンティティに関するビジネスロジック（メソッド）をここに追加していくこともできる
	// 例えば、条件を更新するメソッドとか、本文を更新するメソッドとか
	public updateName(newName: string): void {
		if (!newName) {
			throw new Error("Template name cannot be empty.");
		}
		this.name = newName;
		this.updatedAt = new Date();
	}

	// 他のプロパティを更新するメソッドも同様に定義できる
}
