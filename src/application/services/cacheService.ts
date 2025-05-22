// src/application/services/cacheService.ts (新規作成、または domain/services でもええで)

export interface CacheService {
	/**
	 * 指定されたキーでキャッシュから値を取得する
	 * @param key キャッシュキー
	 * @returns キャッシュされた値、または見つからなければnull
	 */
	get<T>(key: string): Promise<T | null>;

	/**
	 * 指定されたキーと値でキャッシュに保存する
	 * @param key キャッシュキー
	 * @param value 保存する値
	 * @param ttlSeconds キャッシュの有効期間（秒）。省略した場合は永続（またはデフォルトTTL）
	 */
	set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;

	/**
	 * 指定されたキーのキャッシュを削除する
	 * @param key キャッシュキー
	 */
	delete(key: string): Promise<void>;

	// 必要なら他のメソッドも (例: clearAll, hasKey など)
}
