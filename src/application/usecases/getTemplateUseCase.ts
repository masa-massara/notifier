// src/application/usecases/getTemplateUseCase.ts
import type { Template } from "../../domain/entities/template"; // Templateエンティティの型
import type { TemplateRepository } from "../../domain/repositories/templateRepository";

// ユースケースの入力 (テンプレートID)
export interface GetTemplateInput {
	id: string;
}

// ユースケースの出力 (見つかったテンプレート情報、またはnull)
// CreateTemplateOutputとほぼ同じやけど、見つからない場合もあるから分けて定義してもええな
export type GetTemplateOutput = Template | null; // 見つからなければnullを返す想定

export class GetTemplateUseCase {
	constructor(private readonly templateRepository: TemplateRepository) {}

	async execute(input: GetTemplateInput): Promise<GetTemplateOutput> {
		const template = await this.templateRepository.findById(input.id);

		if (!template) {
			// ここでエラーを投げるか、nullをそのまま返すかは設計次第
			// APIハンドラ側で404を返すなら、nullを返すのがシンプルかも
			console.log(
				`Template with id ${input.id} not found by GetTemplateUseCase.`,
			);
			return null;
		}

		// Firestoreから取得したエンティティをそのまま返す
		// (もしDTOに変換したいなら、ここで変換処理を入れる)
		return template;
	}
}
