// src/application/usecases/updateTemplateUseCase.ts
import type {
	Template,
	TemplateCondition,
} from "../../domain/entities/template";
import type { TemplateRepository } from "../../domain/repositories/templateRepository";

export interface UpdateTemplateInput {
	id: string; // 更新対象のID (これは必須)
	userId: string; // ★★★ Input DTOにuserIdを追加 ★★★
	name?: string;
	notionDatabaseId?: string;
	body?: string;
	conditions?: TemplateCondition[];
	destinationId?: string;
}

// ユースケースの出力 (更新後のテンプレート情報)
export type UpdateTemplateOutput = Template; // 更新されたTemplateエンティティを返す (userIdも含まれる)

export class UpdateTemplateUseCase {
	constructor(private readonly templateRepository: TemplateRepository) {}

	async execute(input: UpdateTemplateInput): Promise<UpdateTemplateOutput> {
		// 1. まず、更新対象のテンプレートが存在するか、かつ操作ユーザーのものであるか確認
		// ★★★ findByIdにuserIdを渡す ★★★
		const existingTemplate = await this.templateRepository.findById(
			input.id,
			input.userId,
		);

		if (!existingTemplate) {
			// エラーメッセージも少し具体的にできるかも
			throw new Error(
				`Template with id ${input.id} not found or not accessible by user ${input.userId}.`,
			);
		}

		// 2. 入力された値でエンティティのプロパティを更新する
		let updated = false;
		if (input.name !== undefined && existingTemplate.name !== input.name) {
			existingTemplate.updateName(input.name); // Templateエンティティのメソッドを呼ぶ
			updated = true;
		}
		if (
			input.notionDatabaseId !== undefined &&
			existingTemplate.notionDatabaseId !== input.notionDatabaseId
		) {
			existingTemplate.notionDatabaseId = input.notionDatabaseId;
			updated = true;
		}
		if (input.body !== undefined && existingTemplate.body !== input.body) {
			existingTemplate.body = input.body;
			updated = true;
		}
		if (input.conditions !== undefined) {
			// conditionsの比較は少し複雑なので、ここでは単純に更新
			existingTemplate.conditions = input.conditions;
			updated = true;
		}
		if (
			input.destinationId !== undefined &&
			existingTemplate.destinationId !== input.destinationId
		) {
			existingTemplate.destinationId = input.destinationId;
			updated = true;
		}

		// もし何かしら更新があった場合のみ、updatedAtを更新し、保存する
		if (updated) {
			existingTemplate.updatedAt = new Date(); // updatedAtも更新
			// 3. 更新したエンティティをリポジトリで保存する
			await this.templateRepository.save(existingTemplate);
		}

		// 4. 更新後のエンティティを返す
		return existingTemplate;
	}
}
