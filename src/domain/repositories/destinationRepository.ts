// src/domain/repositories/destinationRepository.ts
import type { Destination } from "../entities/destination";

export interface DestinationRepository {
	/**
	 * 新しい送信先を保存する、または既存の送信先を更新する。
	 * Destinationエンティティ自体にuserIdが含まれるため、このメソッドの
	 * シグネチャにuserIdを明示的に追加する必要はない。
	 * 実装側でエンティティ内のuserIdを利用して適切な保存処理を行う。
	 */
	save(destination: Destination): Promise<void>;

	/**
	 * 指定されたIDとユーザーIDに一致する送信先を1件取得する。
	 * 見つからなければnullを返す。
	 * @param id 取得対象の送信先ID
	 * @param userId 送信先を所有するユーザーのID
	 */
	findById(id: string, userId: string): Promise<Destination | null>;

	/**
	 * 指定されたIDとユーザーIDに一致する送信先を削除する。
	 * @param id 削除対象の送信先ID
	 * @param userId 送信先を所有するユーザーのID
	 */
	deleteById(id: string, userId: string): Promise<void>;

	/**
	 * 指定されたユーザーIDに一致する全ての送信先を取得する。
	 * @param userId 送信先を所有するユーザーのID
	 */
	findAll(userId: string): Promise<Destination[]>;
}
