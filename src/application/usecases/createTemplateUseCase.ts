// src/application/usecases/createTemplateUseCase.ts
import {
	Template,
	type TemplateCondition,
} from "../../domain/entities/template";
import type { TemplateRepository } from "../../domain/repositories/templateRepository";
import { v4 as uuidv4 } from "uuid"; // ID生成用

// ユースケースに入力されるデータのための型 (DTO: Data Transfer Object)
export interface CreateTemplateInput {
	name: string;
	notionDatabaseId: string;
	body: string;
	conditions: TemplateCondition[]; // Templateエンティティで定義した型を使う
	destinationId: string;
}

// ユースケースが出力するデータのための型 (DTO) - 作成されたテンプレートを返す場合
export interface CreateTemplateOutput {
	id: string;
	name: string;
	notionDatabaseId: string;
	body: string;
	conditions: TemplateCondition[];
	destinationId: string;
	createdAt: Date;
	updatedAt: Date;
}

export class CreateTemplateUseCase {
	// このユースケースはTemplateRepositoryに依存する
	constructor(private readonly templateRepository: TemplateRepository) {}

	async execute(input: CreateTemplateInput): Promise<CreateTemplateOutput> {
		// 1. 新しいIDを生成
		const id = uuidv4();

		// 2. Templateエンティティを作成
		const newTemplate = new Template(
			id,
			input.name,
			input.notionDatabaseId,
			input.body,
			input.conditions,
			input.destinationId,
			// createdAt と updatedAt はエンティティのコンストラクタでデフォルト値が設定される
		);

		// 3. リポジトリを使ってエンティティを保存
		await this.templateRepository.save(newTemplate);

		// 4. 保存されたエンティティの情報をOutput DTOとして返す
		return {
			id: newTemplate.id,
			name: newTemplate.name,
			notionDatabaseId: newTemplate.notionDatabaseId,
			body: newTemplate.body,
			conditions: newTemplate.conditions,
			destinationId: newTemplate.destinationId,
			createdAt: newTemplate.createdAt,
			updatedAt: newTemplate.updatedAt,
		};
	}
}
