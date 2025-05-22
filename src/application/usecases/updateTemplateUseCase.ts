// src/application/usecases/updateTemplateUseCase.ts
import type {
	Template,
	TemplateCondition,
} from "../../domain/entities/template";
import type { TemplateRepository } from "../../domain/repositories/templateRepository";

// ユースケースの入力 (更新するIDと、更新可能なフィールド)
// 更新可能なフィールドは部分的に指定できるように、Partial<T> とかを使ってもええけど、
// 今回はシンプルに全部指定する形にしとこか (必須じゃない項目はオプショナルにする)
export interface UpdateTemplateInput {
	id: string; // 更新対象のID (これは必須)
	name?: string;
	notionDatabaseId?: string;
	body?: string;
	conditions?: TemplateCondition[];
	destinationId?: string;
}

// ユースケースの出力 (更新後のテンプレート情報)
export type UpdateTemplateOutput = Template; // 更新されたTemplateエンティティを返す

export class UpdateTemplateUseCase {
	constructor(private readonly templateRepository: TemplateRepository) {}

	async execute(input: UpdateTemplateInput): Promise<UpdateTemplateOutput> {
		// 1. まず、更新対象のテンプレートが存在するか確認
		const existingTemplate = await this.templateRepository.findById(input.id);

		if (!existingTemplate) {
			// エラーを投げるか、あるいは特定のレスポンスを返すかは設計次第
			// ここではエラーを投げて、ハンドラ側で404を返すようにする想定
			throw new Error(`Template with id ${input.id} not found.`);
		}

		// 2. 入力された値でエンティティのプロパティを更新する
		// Templateエンティティに更新用のメソッドを作っておくと、ビジネスロジックをエンティティに寄せられる
		if (input.name !== undefined) {
			// undefinedとの比較で、空文字列を渡した場合も更新対象にする
			existingTemplate.updateName(input.name); // Templateエンティティのメソッドを呼ぶ (例)
		}
		if (input.notionDatabaseId !== undefined) {
			existingTemplate.notionDatabaseId = input.notionDatabaseId; // 直接代入するか、専用メソッドを作るか
			existingTemplate.updatedAt = new Date(); // updatedAtも更新
		}
		if (input.body !== undefined) {
			existingTemplate.body = input.body;
			existingTemplate.updatedAt = new Date();
		}
		if (input.conditions !== undefined) {
			existingTemplate.conditions = input.conditions;
			existingTemplate.updatedAt = new Date();
		}
		if (input.destinationId !== undefined) {
			existingTemplate.destinationId = input.destinationId;
			existingTemplate.updatedAt = new Date();
		}
		// (注意: 上記の直接代入の部分は、Templateエンティティに専用の更新メソッドを作って、
		// そこでバリデーションやupdatedAtの更新を一括で行う方がより良い設計になるで)

		// 3. 更新したエンティティをリポジトリで保存する
		// saveメソッドは新規作成と更新の両方を扱えるように作ってあるはず
		await this.templateRepository.save(existingTemplate);

		// 4. 更新後のエンティティを返す
		return existingTemplate;
	}
}
