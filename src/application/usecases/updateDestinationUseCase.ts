// src/application/usecases/updateDestinationUseCase.ts
import type { Destination } from "../../domain/entities/destination";
import type { DestinationRepository } from "../../domain/repositories/destinationRepository";

// ユースケースの入力: 更新するIDと、更新可能なフィールド
export interface UpdateDestinationInput {
	id: string; // 更新対象のID (必須)
	name?: string;
	webhookUrl?: string;
}

// ユースケースの出力: 更新後の送信先情報
export type UpdateDestinationOutput = Destination;

export class UpdateDestinationUseCase {
	constructor(private readonly destinationRepository: DestinationRepository) {}

	async execute(
		input: UpdateDestinationInput,
	): Promise<UpdateDestinationOutput> {
		console.log(
			`UpdateDestinationUseCase: Attempting to update destination ID: ${input.id}`,
		);

		// 1. 既存の送信先を取得
		const existingDestination = await this.destinationRepository.findById(
			input.id,
		);

		if (!existingDestination) {
			console.error(
				`UpdateDestinationUseCase: Destination with ID ${input.id} not found.`,
			);
			throw new Error(`Destination with id ${input.id} not found.`); // エラーを投げてハンドラで処理
		}

		// 2. エンティティの更新メソッドを使って情報を更新
		//    (Destinationエンティティに updateName, updateWebhookUrl メソッドがある想定)
		if (input.name !== undefined) {
			existingDestination.updateName(input.name); // エンティティのメソッドで更新
		}
		if (input.webhookUrl !== undefined) {
			existingDestination.updateWebhookUrl(input.webhookUrl); // エンティティのメソッドで更新
		}
		// 注意: Destinationエンティティに上記のような更新メソッドと、
		// それに伴うバリデーション、updatedAtの更新処理を実装する必要があるで！

		// 3. 更新したエンティティを保存
		await this.destinationRepository.save(existingDestination);
		console.log(
			`UpdateDestinationUseCase: Destination ID ${input.id} updated successfully.`,
		);

		return existingDestination;
	}
}
