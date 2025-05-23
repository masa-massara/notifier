// src/application/usecases/getDestinationUseCase.ts
import type { Destination } from "../../domain/entities/destination";
import type { DestinationRepository } from "../../domain/repositories/destinationRepository";

export interface GetDestinationInput {
	id: string;
	userId: string; // ★★★ Input DTOにuserIdを追加 ★★★
}

export type GetDestinationOutput = Destination | null;

export class GetDestinationUseCase {
	constructor(private readonly destinationRepository: DestinationRepository) {}

	async execute(input: GetDestinationInput): Promise<GetDestinationOutput> {
		console.log(
			`GetDestinationUseCase: Attempting to find destination with ID: ${input.id} for user ${input.userId}`, // ★ ログにuserIdを追加
		);
		// ★★★ リポジトリのfindByIdメソッドにuserIdを渡す ★★★
		const destination = await this.destinationRepository.findById(
			input.id,
			input.userId,
		);

		if (!destination) {
			console.log(
				`GetDestinationUseCase: Destination with ID ${input.id} not found for user ${input.userId}.`, // ★ ログにuserIdを追加
			);
			return null;
		}
		console.log(
			`GetDestinationUseCase: Found destination for user ${input.userId}:`,
			destination,
		); // ★ ログにuserIdを追加
		return destination;
	}
}
