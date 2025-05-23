// src/application/usecases/getTemplateUseCase.ts
import type { Template } from "../../domain/entities/template"; // Templateエンティティの型
import type { TemplateRepository } from "../../domain/repositories/templateRepository";

// ユースケースの入力 (テンプレートIDとユーザーID)
export interface GetTemplateInput {
	id: string;
	userId: string; // ★★★ Input DTOにuserIdを追加 ★★★
}

// ユースケースの出力 (見つかったテンプレート情報、またはnull)
export type GetTemplateOutput = Template | null;

export class GetTemplateUseCase {
	constructor(private readonly templateRepository: TemplateRepository) {}

	async execute(input: GetTemplateInput): Promise<GetTemplateOutput> {
		// ★★★ リポジトリのfindByIdメソッドにuserIdを渡す ★★★
		const template = await this.templateRepository.findById(
			input.id,
			input.userId,
		);

		if (!template) {
			console.log(
				`Template with id ${input.id} not found for user ${input.userId} by GetTemplateUseCase.`,
			);
			return null;
		}

		// Firestoreから取得したエンティティをそのまま返す
		// (エンティティにはuserIdが含まれている)
		return template;
	}
}
