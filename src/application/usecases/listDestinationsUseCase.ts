// src/application/usecases/listDestinationsUseCase.ts
import type { Destination } from "../../domain/entities/destination";
import type { DestinationRepository } from "../../domain/repositories/destinationRepository";

// ユースケースの入力 (ユーザーID)
export interface ListDestinationsInput {
	// ★ Input DTOを定義
	userId: string;
}

// ユースケースの出力 (Destinationの配列)
export type ListDestinationsOutput = Destination[];

export class ListDestinationsUseCase {
	constructor(private readonly destinationRepository: DestinationRepository) {}

	async execute(input: ListDestinationsInput): Promise<ListDestinationsOutput> {
		// ★ 引数をInput DTOに変更
		console.log(
			`ListDestinationsUseCase: Attempting to execute findAll for user ${input.userId}...`,
		); // ★ ログにuserIdを追加
		const destinations = await this.destinationRepository.findAll(input.userId); // ★ findAllにuserIdを渡す
		console.log(
			`ListDestinationsUseCase: Found ${destinations.length} destinations for user ${input.userId}.`, // ★ ログにuserIdを追加
		);
		return destinations;
	}
}
