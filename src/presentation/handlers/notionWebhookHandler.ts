// src/presentation/handlers/notionWebhookHandler.ts
import type { Context } from "hono";
// あとで ProcessNotionWebhookUseCase をインポートする
// import type { ProcessNotionWebhookUseCase, ProcessNotionWebhookInput } from '../../application/usecases/processNotionWebhookUseCase';

// ダミーのユースケースの型 (あとで本物と差し替える)
interface ProcessNotionWebhookUseCase {
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	execute(input: any): Promise<void>;
}
interface ProcessNotionWebhookInput {
	// Notionからのデータ構造に合わせて定義する
	// 例: properties: any; parentDatabaseId: string; など
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	[key: string]: any; // 一旦、何でも受け取れるようにしとく
}

export const notionWebhookHandlerFactory = (
	processNotionWebhookUseCase: ProcessNotionWebhookUseCase, // ユースケースを注入
) => {
	console.log("--- notionWebhookHandlerFactory called ---"); // 起動時ログ
	return async (c: Context): Promise<Response> => {
		console.log("--- notionWebhookHandler (actual handler) called ---"); // リクエスト時ログ
		try {
			// Notionからのリクエストボディを取得
			// NotionのWebhookの具体的なデータ構造は、実際に受信してみるか、
			// Notionのドキュメントで確認する必要があるな。
			const notionData = await c.req.json<ProcessNotionWebhookInput>();
			console.log(
				"Received Notion Webhook data:",
				JSON.stringify(notionData, null, 2),
			);

			// (ここにリクエストの認証処理を入れるのが望ましい)
			// 例: const signature = c.req.header('X-Notion-Signature-V1');
			//      if (!isValidSignature(notionData, signature)) {
			//        return c.json({ error: 'Invalid signature' }, 401);
			//      }

			// ユースケースに処理を依頼
			await processNotionWebhookUseCase.execute(notionData);

			// NotionのWebhookは、通常200 OKを返せばOKなことが多い
			// (非同期で処理を進める場合)
			return c.json({ message: "Webhook received" }, 200);
			// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		} catch (error: any) {
			console.error("Error in notionWebhookHandler:", error);
			// Notion側にエラーを伝える場合は、適切なステータスコードを返す
			return c.json(
				{ error: "Failed to process Notion webhook", details: error.message },
				500,
			);
		}
	};
};
