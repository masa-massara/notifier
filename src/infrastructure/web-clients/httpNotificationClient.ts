// src/infrastructure/web-clients/httpNotificationClient.ts
import type {
	NotificationClient,
	NotificationPayload,
} from "../../domain/services/notificationClient";

export class HttpNotificationClient implements NotificationClient {
	constructor() {
		console.log("HttpNotificationClient initialized.");
	}

	async send(webhookUrl: string, payload: NotificationPayload): Promise<void> {
		// 送信先のサービス（DiscordかTeamsかなど）によって、ペイロードのキーを使い分ける必要があるかもしれん。
		// ここでは、contentがあればそれを使い、なければtextを使う、みたいな単純な判定にしとく。
		// もっとちゃんとするなら、Destinationエンティティにサービスタイプ（"discord", "teams"など）を持たせて、
		// それに応じてペイロードを組み立てるのがええな。
		const bodyToSend = JSON.stringify(payload);

		console.log(
			`HttpNotificationClient: Sending notification to ${webhookUrl}`,
		);
		// console.debug(`HttpNotificationClient: Payload being sent:`, bodyToSend); // 詳細ログ

		try {
			const response = await fetch(webhookUrl, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: bodyToSend,
			});

			if (!response.ok) {
				// ステータスコードが 2xx 以外の場合はエラー
				const errorBody = await response.text(); // エラーレスポンスの本文も取得してみる
				console.error(
					`HttpNotificationClient: Error sending notification to ${webhookUrl}. Status: ${response.status} ${response.statusText}, Body: ${errorBody}`,
				);
				// ここでエラーをthrowすると、ProcessNotionWebhookUseCaseのcatchブロックで捕まえられる
				throw new Error(
					`Failed to send notification to ${webhookUrl}. Status: ${response.status} ${response.statusText}, Body: ${errorBody}`,
				);
			}
			console.log(
				`HttpNotificationClient: Notification sent successfully to ${webhookUrl}. Status: ${response.status}`,
			);
		} catch (error) {
			console.error(
				`HttpNotificationClient: Exception occurred while sending notification to ${webhookUrl}:`,
				error,
			);
			// ネットワークエラーなどもここでキャッチされる
			throw error; // エラーを上位に伝播させる
		}
	}
}
