// src/application/usecases/listTemplatesUseCase.ts
import type { Template } from "../../domain/entities/template";
import type { TemplateRepository } from "../../domain/repositories/templateRepository";

// ユースケースの入力 (ユーザーID)
export interface ListTemplatesInput {
	// ★ Input DTOを定義
	userId: string;
}

// ユースケースの出力 (テンプレートの配列)
export type ListTemplatesOutput = Template[];

export class ListTemplatesUseCase {
	constructor(private readonly templateRepository: TemplateRepository) {}

	async execute(input: ListTemplatesInput): Promise<ListTemplatesOutput> {
		// ★ 引数をInput DTOに変更
		console.log(
			`ListTemplatesUseCase: Attempting to execute findAll for user ${input.userId}...`,
		); // ★ ログにuserIdを追加
		const templates = await this.templateRepository.findAll(input.userId); // ★ findAllにuserIdを渡す
		console.log(
			`ListTemplatesUseCase: Found ${templates.length} templates for user ${input.userId}.`,
		); // ★ ログにuserIdを追加
		return templates;
	}
}
