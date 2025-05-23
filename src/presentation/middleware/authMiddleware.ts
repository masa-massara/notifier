// 例: src/presentation/middleware/authMiddleware.ts

import type { MiddlewareHandler } from "hono";
// import { firebaseAdmin } from "../../config/firebase"; // Firebase Admin SDKのインスタンスをインポート (後で作る)
// もしくは、getAuth() を直接インポートして使う
import { getAuth } from "firebase-admin/auth";

export const authMiddleware: MiddlewareHandler = async (c, next) => {
	const authHeader = c.req.header("Authorization");

	if (!authHeader || !authHeader.startsWith("Bearer ")) {
		return c.json(
			{ error: "Unauthorized", message: "Bearer token is missing or invalid." },
			401,
		);
	}

	const idToken = authHeader.split("Bearer ")[1];

	try {
		// Firebase Admin SDKのgetAuth()を直接使う場合
		const decodedToken = await getAuth().verifyIdToken(idToken);
		// もし、初期化済みのadminインスタンスをどこかでエクスポートしてるなら、それ経由でもOK
		// const decodedToken = await firebaseAdmin.auth().verifyIdToken(idToken);

		if (!decodedToken || !decodedToken.uid) {
			return c.json(
				{ error: "Unauthorized", message: "Invalid token credentials." },
				401,
			);
		}

		c.set("userId", decodedToken.uid); // ユーザーIDをコンテキストにセット
		// 必要なら他のユーザー情報もセットしてええで
		// c.set('userEmail', decodedToken.email);
		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	} catch (error: any) {
		console.error("Error verifying ID token:", error.message);
		if (error.code === "auth/id-token-expired") {
			return c.json(
				{ error: "Unauthorized", message: "Token has expired." },
				401,
			);
		}
		return c.json({ error: "Unauthorized", message: "Invalid token." }, 401);
	}

	await next(); // 次のミドルウェアまたはルートハンドラへ
};
