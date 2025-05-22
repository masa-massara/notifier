// src/domain/services/notificationClient.ts
export interface NotificationPayload {
	// DiscordやTeamsなど、送信先サービスに応じてペイロードの形式は変わる。
	// ここでは、一番シンプルなテキストメッセージを想定した共通の形を考えてみる。
	// より具体的には、送信先サービスごとに型を分けるか、
	// このペイロードをもっと汎用的にして、送信クライアント側で変換するのがええな。

	// 例: Discord (contentプロパティが必須)
	content?: string;

	// 例: Microsoft Teams (textプロパティが一般的)
	text?: string;

	// TODO: 将来的には、もっとリッチなメッセージ（埋め込みとか、カードとか）も送れるように拡張したいな
	// attachments?: any[];
	// embeds?: any[];
}

export interface NotificationClient {
	/**
	 * 指定されたWebhook URLに通知メッセージを送信する
	 * @param webhookUrl 通知先のWebhook URL
	 * @param payload 送信するメッセージペイロード (NotificationPayload)
	 * @returns 送信が成功したかどうか (エラー時は例外を投げる想定なのでvoidでも良い)
	 */
	send(webhookUrl: string, payload: NotificationPayload): Promise<void>;
}
