// src/application/usecases/listDestinationsUseCase.ts
import type { Destination } from "../../domain/entities/destination";
import type { DestinationRepository } from "../../domain/repositories/destinationRepository";

// ユースケースの入力 (今回はなし)
// export interface ListDestinationsInput {}

// ユースケースの出力 (Destinationの配列)
export type ListDestinationsOutput = Destination[];

export class ListDestinationsUseCase {
	constructor(private readonly destinationRepository: DestinationRepository) {}

	async execute(): Promise<ListDestinationsOutput> {
		console.log("ListDestinationsUseCase: Attempting to execute findAll...");
		const destinations = await this.destinationRepository.findAll();
		console.log(
			`ListDestinationsUseCase: Found ${destinations.length} destinations.`,
		);
		return destinations;
	}
}
