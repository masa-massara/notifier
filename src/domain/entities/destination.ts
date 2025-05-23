// src/domain/entities/destination.ts

export class Destination {
	public readonly id: string; // これもUUIDとかで一意に識別する
	public name?: string; // 送信先名（オプション）
	public webhookUrl: string; // 送信先のWebhook URL
	public readonly userId: string;
	public createdAt: Date;
	public updatedAt: Date;

	constructor(
		id: string,
		webhookUrl: string,
		userId: string,
		name?: string, // name はオプションなので ? をつけて、引数の最後の方にしとくとええで
		createdAt?: Date,
		updatedAt?: Date,
	) {
		// Webhook URLがちゃんとURLっぽいか、簡単なチェックはしてもええかもしれんな
		if (!this.isValidHttpUrl(webhookUrl)) {
			throw new Error("Invalid Webhook URL format.");
		}

		this.id = id;
		this.webhookUrl = webhookUrl;
		this.userId = userId;
		if (name) {
			// name が指定されてたら設定する
			this.name = name;
		}
		this.createdAt = createdAt || new Date();
		this.updatedAt = updatedAt || new Date();
	}

	// Webhook URLの形式をめっちゃ簡単にチェックするヘルパーメソッド（もっとちゃんとやるならライブラリ使うのがええで）
	private isValidHttpUrl(str: string): boolean {
		try {
			const url = new URL(str);
			return url.protocol === "http:" || url.protocol === "https:";
		} catch (_) {
			return false;
		}
	}

	// 送信先名を更新するメソッド
	public updateName(newName?: string): void {
		this.name = newName;
		this.updatedAt = new Date();
	}

	// Webhook URLを更新するメソッド
	public updateWebhookUrl(newWebhookUrl: string): void {
		if (!this.isValidHttpUrl(newWebhookUrl)) {
			throw new Error("Invalid Webhook URL format.");
		}
		this.webhookUrl = newWebhookUrl;
		this.updatedAt = new Date();
	}
}
