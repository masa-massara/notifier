// src/infrastructure/persistence/inMemory/inMemoryCacheService.ts
import type { CacheService } from "../../../application/services/cacheService"; // CacheServiceインターフェースのパスを確認・調整してな

interface CacheEntry<T> {
	value: T;
	expiresAt?: number; // 有効期限 (Unixタイムスタンプ milliseconds)
}

export class InMemoryCacheService implements CacheService {
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	private cache: Map<string, CacheEntry<any>> = new Map();

	constructor() {
		console.log("InMemoryCacheService initialized.");
		// 定期的に期限切れのキャッシュをクリーンアップする処理を入れてもええ
		// setInterval(() => this.cleanupExpired(), 60 * 1000); // 例: 1分ごと
	}

	async get<T>(key: string): Promise<T | null> {
		const entry = this.cache.get(key);
		if (!entry) {
			// console.log(`InMemoryCache: Cache miss for key "${key}"`);
			return null;
		}

		if (entry.expiresAt && entry.expiresAt < Date.now()) {
			console.log(`InMemoryCache: Cache expired for key "${key}", deleting.`);
			this.cache.delete(key);
			return null;
		}

		// console.log(`InMemoryCache: Cache hit for key "${key}"`);
		return entry.value as T;
	}

	async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
		const entry: CacheEntry<T> = { value };
		if (ttlSeconds && ttlSeconds > 0) {
			entry.expiresAt = Date.now() + ttlSeconds * 1000;
		}
		this.cache.set(key, entry);
		console.log(
			`InMemoryCache: Value set for key "${key}"${
				ttlSeconds ? ` with TTL ${ttlSeconds}s` : ""
			}`,
		);
	}

	async delete(key: string): Promise<void> {
		this.cache.delete(key);
		console.log(`InMemoryCache: Value deleted for key "${key}"`);
	}

	// (オプション) 期限切れキャッシュのクリーンアップ
	private cleanupExpired(): void {
		const now = Date.now();
		for (const [key, entry] of this.cache.entries()) {
			if (entry.expiresAt && entry.expiresAt < now) {
				this.cache.delete(key);
				console.log(`InMemoryCache: Cleaned up expired key "${key}"`);
			}
		}
	}
}
