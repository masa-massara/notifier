// src/application/usecases/getDestinationUseCase.ts
import type { Destination } from "../../domain/entities/destination";
import type { DestinationRepository } from "../../domain/repositories/destinationRepository";

export interface GetDestinationInput {
	id: string;
}

export type GetDestinationOutput = Destination | null;

export class GetDestinationUseCase {
	constructor(private readonly destinationRepository: DestinationRepository) {}

	async execute(input: GetDestinationInput): Promise<GetDestinationOutput> {
		console.log(
			`GetDestinationUseCase: Attempting to find destination with ID: ${input.id}`,
		);
		const destination = await this.destinationRepository.findById(input.id);

		if (!destination) {
			console.log(
				`GetDestinationUseCase: Destination with ID ${input.id} not found.`,
			);
			return null;
		}
		console.log("GetDestinationUseCase: Found destination:", destination);
		return destination;
	}
}
