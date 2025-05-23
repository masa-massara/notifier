// src/application/usecases/deleteDestinationUseCase.ts
import type { DestinationRepository } from "../../domain/repositories/destinationRepository";

export interface DeleteDestinationInput {
	id: string;
	userId: string; // ★★★ Input DTOにuserIdを追加 ★★★
}

// export type DeleteDestinationOutput = void; // 今回も何も返さない

export class DeleteDestinationUseCase {
	constructor(private readonly destinationRepository: DestinationRepository) {}

	async execute(input: DeleteDestinationInput): Promise<void> {
		console.log(
			`DeleteDestinationUseCase: Attempting to delete destination ID: ${input.id} for user ${input.userId}`, // ★ ログにuserIdを追加
		);
		// ★★★ リポジトリのdeleteByIdメソッドにuserIdを渡す ★★★
		// リポジトリのdeleteByIdが、存在確認と所有者確認を行うことを期待する。
		await this.destinationRepository.deleteById(input.id, input.userId);
		console.log(
			`DeleteDestinationUseCase: Destination ID ${input.id} for user ${input.userId} deletion processed.`, // ★ ログにuserIdを追加
		);
	}
}
