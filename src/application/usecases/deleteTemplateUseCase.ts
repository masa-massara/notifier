// src/application/usecases/deleteTemplateUseCase.ts
import type { TemplateRepository } from "../../domain/repositories/templateRepository";

// ユースケースの入力 (削除するテンプレートのID)
export interface DeleteTemplateInput {
	id: string;
}

// ユースケースの出力 (今回はなし。エラーがなければ成功とする)
// export type DeleteTemplateOutput = void; // もし明示するなら

export class DeleteTemplateUseCase {
	constructor(private readonly templateRepository: TemplateRepository) {}

	async execute(input: DeleteTemplateInput): Promise<void> {
		// 1. まず、削除対象のテンプレートが存在するか確認 (オプション)
		//    findByIdで見つからなければエラーを投げる、という処理を入れてもええけど、
		//    deleteByIdが冪等性（何回実行しても同じ結果になる性質）を持つように、
		//    存在しなくてもエラーにしない、という考え方もある。
		//    今回は、リポジトリのdeleteByIdがよしなにやってくれると信じて、
		//    ここでは存在確認を省略してみる。
		// const existingTemplate = await this.templateRepository.findById(input.id);
		// if (!existingTemplate) {
		//   throw new Error(`Template with id ${input.id} not found. Cannot delete.`);
		// }

		// 2. リポジトリを使ってテンプレートを削除
		await this.templateRepository.deleteById(input.id);

		// 3. 特に返す値はないので、処理が完了すればOK
		console.log(
			`DeleteTemplateUseCase: Template with id ${input.id} deletion processed.`,
		);
	}
}
