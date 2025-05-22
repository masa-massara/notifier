// src/infrastructure/persistence/inMemory/inMemoryDestinationRepository.ts
import type { Destination } from "../../../domain/entities/destination"; // ドメイン層のエンティティ
import type { DestinationRepository } from "../../../domain/repositories/destinationRepository"; // ドメイン層のリポジトリインターフェース

export class InMemoryDestinationRepository implements DestinationRepository {
	private readonly destinations: Destination[] = [];

	async save(destination: Destination): Promise<void> {
		const existingIndex = this.destinations.findIndex(
			(d) => d.id === destination.id,
		);

		if (existingIndex > -1) {
			this.destinations[existingIndex] = destination;
		} else {
			this.destinations.push(destination);
		}
		return Promise.resolve();
	}

	async findById(id: string): Promise<Destination | null> {
		const destination = this.destinations.find((d) => d.id === id);
		return Promise.resolve(destination || null);
	}

	async deleteById(id: string): Promise<void> {
		const index = this.destinations.findIndex((d) => d.id === id);
		if (index > -1) {
			this.destinations.splice(index, 1);
		}
		return Promise.resolve();
	}

	async findAll(): Promise<Destination[]> {
		return Promise.resolve([...this.destinations]); // 配列のコピーを返す
	}

	// (テスト用、またはデバッグ用) 配列をクリアするメソッド
	clear(): void {
		this.destinations.length = 0;
	}
}
