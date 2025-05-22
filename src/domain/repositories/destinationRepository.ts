// src/domain/repositories/destinationRepository.ts
import { Destination } from '../entities/destination'; // さっき作ったDestinationエンティティをインポート

export interface DestinationRepository {
  save(destination: Destination): Promise<void>;
  findById(id: string): Promise<Destination | null>;
  deleteById(id: string): Promise<void>;
  findAll(): Promise<Destination[]>;
}
