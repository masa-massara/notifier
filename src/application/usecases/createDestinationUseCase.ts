// src/application/usecases/createDestinationUseCase.ts
import { Destination } from "../../domain/entities/destination";
import type { DestinationRepository } from "../../domain/repositories/destinationRepository";
import { v4 as uuidv4 } from "uuid"; // ID生成用

// ユースケースに入力されるデータのための型 (DTO)
export interface CreateDestinationInput {
	webhookUrl: string;
	name?: string; // 送信先名はオプション
}

// ユースケースが出力するデータのための型 (DTO) - 作成された送信先情報を返す
export interface CreateDestinationOutput {
	id: string;
	webhookUrl: string;
	name?: string;
	createdAt: Date;
	updatedAt: Date;
}

export class CreateDestinationUseCase {
	constructor(private readonly destinationRepository: DestinationRepository) {}

	async execute(
		input: CreateDestinationInput,
	): Promise<CreateDestinationOutput> {
		const id = uuidv4(); // 新しいIDを生成

		// Destinationエンティティを作成
		const newDestination = new Destination(
			id,
			input.webhookUrl,
			input.name,
			// createdAt と updatedAt はエンティティのコンストラクタでデフォルト値が設定される
		);

		// リポジトリを使ってエンティティを保存
		await this.destinationRepository.save(newDestination);

		// 保存されたエンティティの情報をOutput DTOとして返す
		return {
			id: newDestination.id,
			webhookUrl: newDestination.webhookUrl,
			name: newDestination.name,
			createdAt: newDestination.createdAt,
			updatedAt: newDestination.updatedAt,
		};
	}
}
