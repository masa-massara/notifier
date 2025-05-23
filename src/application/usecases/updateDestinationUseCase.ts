// src/application/usecases/updateDestinationUseCase.ts
import type { Destination } from "../../domain/entities/destination";
import type { DestinationRepository } from "../../domain/repositories/destinationRepository";

// ユースケースの入力: 更新するIDと、更新可能なフィールド
export interface UpdateDestinationInput {
	id: string; // 更新対象のID (必須)
	userId: string; // ★★★ Input DTOにuserIdを追加 ★★★
	name?: string;
	webhookUrl?: string;
}

// ユースケースの出力: 更新後の送信先情報
export type UpdateDestinationOutput = Destination; // 更新されたDestinationエンティティを返す (userIdも含まれる)

export class UpdateDestinationUseCase {
	constructor(private readonly destinationRepository: DestinationRepository) {}

	async execute(
		input: UpdateDestinationInput,
	): Promise<UpdateDestinationOutput> {
		console.log(
			`UpdateDestinationUseCase: Attempting to update destination ID: ${input.id} for user ${input.userId}`, // ★ ログにuserIdを追加
		);

		// 1. 既存の送信先を取得し、操作ユーザーのものであるか確認
		// ★★★ findByIdにuserIdを渡す ★★★
		const existingDestination = await this.destinationRepository.findById(
			input.id,
			input.userId,
		);

		if (!existingDestination) {
			console.error(
				`UpdateDestinationUseCase: Destination with ID ${input.id} not found or not accessible by user ${input.userId}.`, // ★ ログにuserIdを追加
			);
			throw new Error(
				`Destination with id ${input.id} not found or not accessible by user ${input.userId}.`,
			);
		}

		// 2. エンティティの更新メソッドを使って情報を更新
		let updated = false;
		if (input.name !== undefined && existingDestination.name !== input.name) {
			existingDestination.updateName(input.name); // エンティティのメソッドで更新
			updated = true;
		}
		if (
			input.webhookUrl !== undefined &&
			existingDestination.webhookUrl !== input.webhookUrl
		) {
			existingDestination.updateWebhookUrl(input.webhookUrl); // エンティティのメソッドで更新
			updated = true;
		}
		// Destinationエンティティの更新メソッド内でupdatedAtが更新される想定

		// もし何かしら更新があった場合のみ、保存する
		// (エンティティの更新メソッドがupdatedAtを更新するなら、このupdatedフラグは不要で常にsaveでも良い)
		if (updated) {
			// 3. 更新したエンティティを保存
			await this.destinationRepository.save(existingDestination);
			console.log(
				`UpdateDestinationUseCase: Destination ID ${input.id} for user ${input.userId} updated successfully.`, // ★ ログにuserIdを追加
			);
		} else {
			console.log(
				`UpdateDestinationUseCase: No changes detected for destination ID ${input.id} for user ${input.userId}. No save operation performed.`,
			);
		}

		return existingDestination;
	}
}
