// src/application/usecases/deleteDestinationUseCase.ts
import type { DestinationRepository } from "../../domain/repositories/destinationRepository";

export interface DeleteDestinationInput {
	id: string;
}

// export type DeleteDestinationOutput = void; // 今回も何も返さない

export class DeleteDestinationUseCase {
	constructor(private readonly destinationRepository: DestinationRepository) {}

	async execute(input: DeleteDestinationInput): Promise<void> {
		console.log(
			`DeleteDestinationUseCase: Attempting to delete destination ID: ${input.id}`,
		);
		await this.destinationRepository.deleteById(input.id);
		console.log(
			`DeleteDestinationUseCase: Destination ID ${input.id} deletion processed.`,
		);
	}
}
